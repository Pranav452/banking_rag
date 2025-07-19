declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion: string
    IsAcroFormPresent: boolean
    IsXFAPresent: boolean
    Title?: string
    Author?: string
    Subject?: string
    Creator?: string
    Producer?: string
    CreationDate?: string
    ModDate?: string
  }

  interface PDFMetadata {
    info: PDFInfo
    metadata: Record<string, unknown>
    version: string
  }

  interface PDFData {
    numpages: number
    numrender: number
    info: PDFInfo
    metadata: PDFMetadata
    version: string
    text: string
  }

  function pdfParse(buffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>
  export = pdfParse
} 