import { OllamaEmbeddings } from '@langchain/ollama'

export class BankingOllamaEmbeddings {
  private embeddings: OllamaEmbeddings
  private modelName: string
  private baseUrl: string

  constructor() {
    this.modelName = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    
    this.embeddings = new OllamaEmbeddings({
      model: this.modelName,
      baseUrl: this.baseUrl,
    })
  }

  async embedDocument(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text)
      return embedding
    } catch (error) {
      console.error('Error embedding document:', error)
      throw new Error(`Failed to generate embedding: ${error}`)
    }
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts)
      return embeddings
    } catch (error) {
      console.error('Error embedding documents:', error)
      throw new Error(`Failed to generate embeddings: ${error}`)
    }
  }

  async embedQuery(query: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(query)
      return embedding
    } catch (error) {
      console.error('Error embedding query:', error)
      throw new Error(`Failed to generate query embedding: ${error}`)
    }
  }

  // Test connection to Ollama
  async testConnection(): Promise<boolean> {
    try {
      await this.embedQuery('test connection')
      return true
    } catch (error) {
      console.error('Ollama connection test failed:', error)
      return false
    }
  }

  // Get embedding dimensions (Nomic embeddings are 768-dimensional)
  getDimensions(): number {
    return 768
  }
}

// Singleton instance
export const ollamaEmbeddings = new BankingOllamaEmbeddings() 