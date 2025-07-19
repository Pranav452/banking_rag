import { ChatGroq } from '@langchain/groq'
// import { ConversationalRetrievalQAChain } from 'langchain/chains' // Removed unused import
import { BufferMemory, ConversationSummaryMemory } from 'langchain/memory'
import { PromptTemplate } from '@langchain/core/prompts'
import { BaseRetriever } from '@langchain/core/retrievers'
import { Document as LangChainDocument } from 'langchain/document'
import { ollamaEmbeddings } from './embeddings'
import { supabaseAdmin } from './supabase'
import { BankingContext, DocumentSource } from '../types/database'
import { 
  traceVectorRetrieval, 
  traceBankingRAGQuery, 
  traceComplianceCheck, 
  traceLoanCalculation,
  trackQueryMetrics,
  trackError
} from './langsmith-config'

export class BankingVectorRetriever extends BaseRetriever {
  lc_namespace = ['banking', 'retrievers']
  
  constructor(
    private similarityThreshold: number = 0.5,
    private maxResults: number = 5
  ) {
    super()
  }

  async _getRelevantDocuments(query: string): Promise<LangChainDocument[]> {
    return traceVectorRetrieval(query, async () => {
      try {
        // Generate query embedding
        const queryEmbedding = await ollamaEmbeddings.embedQuery(query)
        
        // Search for similar documents using cosine similarity
        const { data: chunks, error } = await supabaseAdmin.rpc('match_documents', {
          query_embedding: JSON.stringify(queryEmbedding),
          match_threshold: this.similarityThreshold,
          match_count: this.maxResults
        })
        
        if (error) throw error
        
        // Convert to LangChain documents
        const documents = chunks.map((chunk: {
          id: string
          document_id: string
          content: string
          similarity: number
          document_type: string
          metadata: Record<string, unknown>
        }) => new LangChainDocument({
          pageContent: chunk.content,
          metadata: {
            document_id: chunk.document_id,
            chunk_id: chunk.id,
            similarity: chunk.similarity,
            document_type: chunk.document_type,
            ...chunk.metadata
          }
        }))
        
        // Track retrieval metrics
        await trackQueryMetrics('vector_retrieval', Date.now(), 0, documents.length)
        
        return documents
      } catch (error) {
        console.error('Retrieval error:', error)
        await trackError('vector_retrieval', error instanceof Error ? error : new Error(String(error)))
        return []
      }
    })
  }
}

export class BankingRAGChain {
  private llm: ChatGroq
  private retriever: BankingVectorRetriever
  private memory: BufferMemory
  private summaryMemory: ConversationSummaryMemory

  constructor() {
    // Initialize Groq LLM
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY || 'dummy-key',
      model: process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile',
      temperature: 0.1, // Low temperature for consistent banking information
      maxTokens: 2000
    })

    this.retriever = new BankingVectorRetriever()
    
    // Set up memory management
    this.memory = new BufferMemory({
      memoryKey: 'chat_history',
      inputKey: 'question',
      outputKey: 'answer',
      returnMessages: true
    })

    this.summaryMemory = new ConversationSummaryMemory({
      llm: this.llm,
      memoryKey: 'summary',
      inputKey: 'question',
      outputKey: 'answer'
    })
  }

  async queryWithContext(
    question: string,
    context: BankingContext = {},
    userId: string | null = null
  ): Promise<{
    answer: string
    sources: DocumentSource[]
    confidence: number
  }> {
    return traceBankingRAGQuery(question, context, async () => {
      const startTime = Date.now()
      
      try {
        // Enhance query with banking context
        const enhancedQuery = this.enhanceQueryWithContext(question, context)
        
        // Retrieve relevant documents
        const relevantDocs = await this.retriever._getRelevantDocuments(enhancedQuery)
        
        if (relevantDocs.length === 0) {
          const result = {
            answer: "I couldn't find relevant information in the banking knowledge base. Could you please rephrase your question or be more specific?",
            sources: [],
            confidence: 0
          }
          
          // Track no results
          await trackQueryMetrics('rag_no_results', Date.now() - startTime, 0, 0)
          
          return result
        }

        // Generate answer using RAG
        const answer = await this.generateAnswer(question, relevantDocs, context)
        
        // Extract sources for citation
        const sources = this.extractSources(relevantDocs)
        
        // Calculate confidence based on similarity scores
        const confidence = this.calculateConfidence(relevantDocs)
        
        // Track successful query
        await trackQueryMetrics('rag_success', Date.now() - startTime, confidence, sources.length)
        
        // Log query for analytics
        await this.logQuery(question, answer, sources, Date.now() - startTime, userId || undefined)
        
        return { answer, sources, confidence }
      } catch (error) {
        console.error('RAG query error:', error)
        await trackError('rag_query', error instanceof Error ? error : new Error(String(error)))
        throw new Error(`Failed to process query: ${error}`)
      }
    })
  }

  private enhanceQueryWithContext(query: string, context: BankingContext): string {
    let enhancedQuery = query
    
    if (context.user_role) {
      enhancedQuery = `As a ${context.user_role}, ${query}`
    }
    
    if (context.loan_products && context.loan_products.length > 0) {
      enhancedQuery += ` (related to ${context.loan_products.join(', ')})`
    }
    
    if (context.regulatory_context && context.regulatory_context.length > 0) {
      enhancedQuery += ` (considering ${context.regulatory_context.join(', ')} regulations)`
    }
    
    return enhancedQuery
  }

  private async generateAnswer(
    question: string,
    documents: LangChainDocument[],
    context: BankingContext
  ): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are a knowledgeable banking assistant specializing in loan products, regulatory compliance, and internal policies. 
Your role is to provide accurate, helpful information based on the provided context documents.

CRITICAL GUIDELINES:
1. Base your answers ONLY on the provided context documents
2. If information isn't in the context, clearly state this limitation
3. For regulatory or compliance questions, emphasize the need for current verification
4. Include specific references to tables, sections, or document types when relevant
5. If dealing with rates or calculations, note effective dates and conditions

Context Documents:
{context_documents}

User Role: {user_role}
Question: {question}

Banking Context:
- Loan Products: {loan_products}
- Regulatory Context: {regulatory_context}
- Current Date: {current_date}

Provide a comprehensive, accurate answer. If the question involves:
- Loan calculations: Show formulas and cite rate sources
- Compliance matters: Reference specific regulations and sections
- Policy questions: Quote relevant policy sections
- Rate information: Include effective dates and conditions

Answer:`)

    const formattedPrompt = await prompt.format({
      context_documents: documents.map((doc, i) => 
        `Document ${i + 1} (${doc.metadata.document_type || 'Unknown'}):\n${doc.pageContent}\n`
      ).join('\n---\n'),
      user_role: context.user_role || 'banking professional',
      question,
      loan_products: context.loan_products?.join(', ') || 'N/A',
      regulatory_context: context.regulatory_context?.join(', ') || 'N/A',
      current_date: new Date().toLocaleDateString()
    })

    const response = await this.llm.invoke(formattedPrompt)
    return response.content as string
  }

  private extractSources(documents: LangChainDocument[]): DocumentSource[] {
    return documents.map(doc => ({
      document_id: doc.metadata.document_id,
      document_title: doc.metadata.document_title || 'Unknown Document',
      chunk_content: doc.pageContent.substring(0, 200) + '...',
      page_number: doc.metadata.page_number,
      section: doc.metadata.section,
      confidence_score: doc.metadata.similarity
    }))
  }

  private calculateConfidence(documents: LangChainDocument[]): number {
    if (documents.length === 0) return 0
    
    const avgSimilarity = documents.reduce((sum, doc) => 
      sum + (doc.metadata.similarity || 0), 0
    ) / documents.length
    
    // Convert similarity to confidence percentage
    return Math.round(avgSimilarity * 100)
  }

  private async logQuery(
    query: string,
    answer: string,
    sources: DocumentSource[],
    responseTime: number,
    userId?: string
  ): Promise<void> {
    try {
      await supabaseAdmin.from('queries').insert({
        user_id: userId,
        query_text: query,
        response_text: answer,
        sources: sources,
        response_time_ms: responseTime,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log query:', error)
    }
  }
}

// Specialized chains for different banking use cases
export class ComplianceRAGChain extends BankingRAGChain {
  constructor() {
    super()
  }

  async checkCompliance(
    scenario: string,
    regulations: string[],
    userId: string | null = null
  ): Promise<{
    compliant: boolean
    issues: string[]
    recommendations: string[]
    sources: DocumentSource[]
  }> {
    return traceComplianceCheck(scenario, regulations, async () => {
      const context: BankingContext = {
        regulatory_context: regulations,
        user_role: 'compliance_analyst'
      }

      const query = `Compliance analysis: ${scenario}. Check against regulations: ${regulations.join(', ')}`
      
      const result = await this.queryWithContext(query, context, userId)
      
      // Parse compliance-specific response
      const complianceResult = {
        compliant: result.answer.toLowerCase().includes('compliant'),
        issues: this.extractIssues(result.answer),
        recommendations: this.extractRecommendations(result.answer),
        sources: result.sources
      }
      
      // Track compliance check metrics
      await trackQueryMetrics('compliance_check', 0, result.confidence, result.sources.length)
      
      return complianceResult
    })
  }

  private extractIssues(answer: string): string[] {
    // Extract potential compliance issues from the answer
    const issuePatterns = [
      /issue[s]?:\s*([^.]+)/gi,
      /violation[s]?:\s*([^.]+)/gi,
      /concern[s]?:\s*([^.]+)/gi
    ]
    
    const issues: string[] = []
    for (const pattern of issuePatterns) {
      const matches = answer.match(pattern)
      if (matches) {
        issues.push(...matches.map(match => match.replace(/^[^:]+:\s*/, '')))
      }
    }
    
    return issues
  }

  private extractRecommendations(answer: string): string[] {
    // Extract recommendations from the answer
    const recPatterns = [
      /recommend[ation]?[s]?:\s*([^.]+)/gi,
      /suggest[ion]?[s]?:\s*([^.]+)/gi,
      /should:\s*([^.]+)/gi
    ]
    
    const recommendations: string[] = []
    for (const pattern of recPatterns) {
      const matches = answer.match(pattern)
      if (matches) {
        recommendations.push(...matches.map(match => match.replace(/^[^:]+:\s*/, '')))
      }
    }
    
    return recommendations
  }
}

export class LoanCalculatorRAGChain extends BankingRAGChain {
  constructor() {
    super()
  }

  async calculateLoan(
    loanType: string,
    amount: number,
    term: number,
    userId: string | null = null
  ): Promise<{
    monthlyPayment: number
    totalInterest: number
    rate: number
    calculations: string
    sources: DocumentSource[]
  }> {
    return traceLoanCalculation(loanType, amount, term, async () => {
      const context: BankingContext = {
        loan_products: [loanType],
        user_role: 'loan_officer'
      }

      const query = `Calculate ${loanType} loan for $${amount} over ${term} months. Include current rates, payment calculation, and total interest.`
      
      const result = await this.queryWithContext(query, context, userId)
      
      // Extract numerical values from response
      const calculations = result.answer
      const rate = this.extractRate(calculations)
      const monthlyPayment = this.calculateMonthlyPayment(amount, rate, term)
      const totalInterest = (monthlyPayment * term) - amount
      
      const calculationResult = {
        monthlyPayment,
        totalInterest,
        rate,
        calculations,
        sources: result.sources
      }
      
      // Track loan calculation metrics
      await trackQueryMetrics('loan_calculation', 0, result.confidence, result.sources.length)
      
      return calculationResult
    })
  }

  private extractRate(calculations: string): number {
    const rateMatch = calculations.match(/(\d+\.?\d*)%/)
    return rateMatch ? parseFloat(rateMatch[1]) : 0
  }

  private calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
    const monthlyRate = annualRate / 100 / 12
    if (monthlyRate === 0) return principal / months
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
           (Math.pow(1 + monthlyRate, months) - 1)
  }
}

// Export singleton instances
export const bankingRAG = new BankingRAGChain()
export const complianceRAG = new ComplianceRAGChain()
export const loanCalculatorRAG = new LoanCalculatorRAGChain() 