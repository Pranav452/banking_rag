import { Client } from 'langsmith'
import { traceable } from 'langsmith/traceable'

// Initialize LangSmith client
export const langsmithClient = new Client({
  apiKey: process.env.LANGSMITH_API_KEY,
  apiUrl: process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com'
})

// Custom traceable decorators for banking operations
export const traceDocumentProcessing = traceable(
  async (
    fileName: string,
    documentType: string,
    processFunction: () => Promise<any>
  ) => {
    return await processFunction()
  },
  {
    name: 'document_processing',
    project_name: process.env.LANGSMITH_PROJECT || 'banking-rag-evaluation',
    tags: ['document-processing', 'banking'],
    metadata: {}
  }
)

export const traceVectorRetrieval = traceable(
  async (
    query: string,
    retrievalFunction: () => Promise<any>
  ) => {
    return await retrievalFunction()
  },
  {
    name: 'vector_retrieval',
    project_name: process.env.LANGSMITH_PROJECT || 'banking-rag-evaluation',
    tags: ['vector-search', 'retrieval', 'banking'],
    metadata: {}
  }
)

export const traceBankingRAGQuery = traceable(
  async (
    question: string,
    context: any,
    ragFunction: () => Promise<any>
  ) => {
    return await ragFunction()
  },
  {
    name: 'banking_rag_query',
    project_name: process.env.LANGSMITH_PROJECT || 'banking-rag-evaluation',
    tags: ['rag', 'banking', 'llm-generation'],
    metadata: {}
  }
)

export const traceComplianceCheck = traceable(
  async (
    scenario: string,
    regulations: string[],
    complianceFunction: () => Promise<any>
  ) => {
    return await complianceFunction()
  },
  {
    name: 'compliance_check',
    project_name: process.env.LANGSMITH_PROJECT || 'banking-rag-evaluation',
    tags: ['compliance', 'banking', 'regulatory'],
    metadata: {}
  }
)

export const traceLoanCalculation = traceable(
  async (
    loanType: string,
    amount: number,
    term: number,
    calculationFunction: () => Promise<any>
  ) => {
    return await calculationFunction()
  },
  {
    name: 'loan_calculation',
    project_name: process.env.LANGSMITH_PROJECT || 'banking-rag-evaluation',
    tags: ['loan-calculation', 'banking', 'financial'],
    metadata: {}
  }
)

// Performance tracking utilities
export const trackQueryMetrics = async (
  queryType: string,
  responseTime: number,
  confidence: number,
  sourceCount: number
) => {
  try {
    return await langsmithClient.createRun({
      name: 'query_metrics',
      run_type: 'tool',
      inputs: { queryType },
      outputs: { responseTime, confidence, sourceCount },
      project_name: process.env.LANGSMITH_PROJECT || 'banking-rag-evaluation'
    })
  } catch (error) {
    console.warn('Failed to track query metrics:', error)
  }
}

// Error tracking
export const trackError = async (
  operation: string,
  error: Error,
  context: Record<string, any> = {}
) => {
  try {
    return await langsmithClient.createRun({
      name: 'error_tracking',
      run_type: 'tool',
      inputs: { operation, context },
      outputs: { error: error.message, stack: error.stack },
      project_name: process.env.LANGSMITH_PROJECT || 'banking-rag-evaluation'
    })
  } catch (trackingError) {
    console.warn('Failed to track error:', trackingError)
  }
} 