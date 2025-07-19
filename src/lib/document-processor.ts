import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document as LangChainDocument } from 'langchain/document'
import pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
import { ollamaEmbeddings } from './embeddings'
import { supabaseAdmin } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export class BankingDocumentProcessor {
  private tableSplitter: BankingDocumentSplitter
  private standardSplitter: RecursiveCharacterTextSplitter

  constructor() {
    this.tableSplitter = new BankingDocumentSplitter()
    this.standardSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', '']
    })
  }

  async processDocument(
    fileBuffer: Buffer,
    fileName: string,
    documentType: string,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    try {
      // Extract text based on file type
      const text = await this.extractText(fileBuffer, fileName)
      
      // Create document record
      const documentId = uuidv4()
      await this.createDocumentRecord(documentId, fileName, documentType, metadata)
      
      // Process and chunk the document
      const chunks = await this.createChunks(text, documentType)
      
      // Generate embeddings and store chunks
      await this.storeChunks(documentId, chunks)
      
      return documentId
    } catch (error) {
      console.error('Document processing error:', error)
      throw new Error(`Failed to process document: ${error}`)
    }
  }

  private async extractText(fileBuffer: Buffer, fileName: string): Promise<string> {
    const extension = fileName.toLowerCase().split('.').pop()
    
    switch (extension) {
      case 'pdf':
        const pdfData = await pdfParse(fileBuffer)
        return pdfData.text
      
      case 'docx':
      case 'doc':
        const docxData = await mammoth.extractRawText({ buffer: fileBuffer })
        return docxData.value
      
      case 'txt':
        return fileBuffer.toString('utf-8')
      
      default:
        throw new Error(`Unsupported file type: ${extension}`)
    }
  }

  private async createDocumentRecord(
    id: string,
    title: string,
    documentType: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('documents')
      .insert([{
        id,
        title,
        document_type: documentType,
        status: 'active',
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
    
    if (error) throw error
  }

  private async createChunks(text: string, documentType: string): Promise<LangChainDocument[]> {
    // Use table-aware chunking for banking documents
    if (this.isBankingDocument(documentType)) {
      return await this.tableSplitter.splitTextIntoDocuments(text)
    } else {
      return await this.standardSplitter.createDocuments([text])
    }
  }

  private async storeChunks(documentId: string, chunks: LangChainDocument[]): Promise<void> {
    const batchSize = 10
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const texts = batch.map(chunk => chunk.pageContent)
      
      // Generate embeddings for the batch
      const embeddings = await ollamaEmbeddings.embedDocuments(texts)
      
      // Prepare chunk records
      const chunkRecords = batch.map((chunk, index) => ({
        id: uuidv4(),
        document_id: documentId,
        content: chunk.pageContent,
        embedding: JSON.stringify(embeddings[index]),
        chunk_index: i + index,
        metadata: chunk.metadata,
        created_at: new Date().toISOString()
      }))
      
      // Insert chunks
      const { error } = await supabaseAdmin
        .from('document_chunks')
        .insert(chunkRecords)
      
      if (error) throw error
    }
  }

  private isBankingDocument(documentType: string): boolean {
    const bankingTypes = [
      'loan_handbook',
      'regulatory_manual',
      'policy_document',
      'rate_sheet',
      'compliance_matrix'
    ]
    return bankingTypes.includes(documentType)
  }
}

export class BankingDocumentSplitter extends RecursiveCharacterTextSplitter {
  private tablePatterns: RegExp[]

  constructor() {
    super({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '|', ' ', '']
    })
    
    this.tablePatterns = [
      /Table \d+\.\d+/g,
      /Schedule [A-Z]+/g,
      /Exhibit \d+/g,
      /\|.*\|/g, // Table rows
      /^[\|\s]*[-\s\|\:]+[\|\s]*$/gm // Table separators
    ]
  }

  async splitTextIntoDocuments(text: string): Promise<LangChainDocument[]> {
    // Identify table sections
    const tableMatches = this.findTableSections(text)
    
    if (tableMatches.length === 0) {
      // No tables found, use standard splitting
      return await super.createDocuments([text])
    }
    
    const chunks: LangChainDocument[] = []
    let lastIndex = 0
    
    for (const tableMatch of tableMatches) {
      // Add text before table
      if (tableMatch.start > lastIndex) {
        const beforeTable = text.slice(lastIndex, tableMatch.start)
        const beforeChunks = await super.createDocuments([beforeTable])
        chunks.push(...beforeChunks)
      }
      
      // Add table as a single chunk with context
      const tableChunk = this.createTableChunk(
        text,
        tableMatch.start,
        tableMatch.end,
        tableMatch.header
      )
      chunks.push(tableChunk)
      
      lastIndex = tableMatch.end
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      const remainingChunks = await super.createDocuments([remainingText])
      chunks.push(...remainingChunks)
    }
    
    return chunks
  }

  private findTableSections(text: string): Array<{
    start: number
    end: number
    header: string
  }> {
    const sections: Array<{ start: number; end: number; header: string }> = []
    
    for (const pattern of this.tablePatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        // Find the full table context
        const context = this.expandTableContext(text, match.index)
        sections.push({
          start: context.start,
          end: context.end,
          header: match[0]
        })
      }
    }
    
    // Merge overlapping sections
    return this.mergeOverlappingSections(sections)
  }

  private expandTableContext(text: string, startIndex: number): {
    start: number
    end: number
  } {
    // Look backwards for table start
    let start = startIndex
    let prevLine = this.findLineStart(text, start)
    while (prevLine > 0 && this.isTableLine(text.slice(prevLine, this.findLineEnd(text, prevLine)))) {
      start = prevLine
      prevLine = this.findLineStart(text, start - 1)
    }
    
    // Look forwards for table end
    let end = startIndex
    let nextLine = this.findLineEnd(text, end)
    while (nextLine < text.length && this.isTableLine(text.slice(this.findLineStart(text, nextLine), nextLine))) {
      end = nextLine
      nextLine = this.findLineEnd(text, end + 1)
    }
    
    return { start, end }
  }

  private createTableChunk(
    text: string,
    start: number,
    end: number,
    header: string
  ): LangChainDocument {
    const tableText = text.slice(start, end)
    const contextBefore = text.slice(Math.max(0, start - 200), start)
    const contextAfter = text.slice(end, Math.min(text.length, end + 200))
    
    const content = `${contextBefore}\n\n[TABLE: ${header}]\n${tableText}\n[END TABLE]\n\n${contextAfter}`
    
    return new LangChainDocument({
      pageContent: content,
      metadata: {
        type: 'table',
        header,
        table_content: tableText
      }
    })
  }

  private isTableLine(line: string): boolean {
    return /^[\|\s]*[\|\-\:\s]+[\|\s]*$/.test(line.trim()) || 
           /\|.*\|/.test(line)
  }

  private findLineStart(text: string, index: number): number {
    const lineStart = text.lastIndexOf('\n', index)
    return lineStart === -1 ? 0 : lineStart + 1
  }

  private findLineEnd(text: string, index: number): number {
    const lineEnd = text.indexOf('\n', index)
    return lineEnd === -1 ? text.length : lineEnd
  }

  private mergeOverlappingSections(sections: Array<{
    start: number
    end: number
    header: string
  }>): Array<{ start: number; end: number; header: string }> {
    if (sections.length === 0) return []
    
    sections.sort((a, b) => a.start - b.start)
    const merged = [sections[0]]
    
    for (let i = 1; i < sections.length; i++) {
      const current = sections[i]
      const last = merged[merged.length - 1]
      
      if (current.start <= last.end + 50) { // Allow small gaps
        last.end = Math.max(last.end, current.end)
        last.header += `, ${current.header}`
      } else {
        merged.push(current)
      }
    }
    
    return merged
  }
}

export const documentProcessor = new BankingDocumentProcessor() 