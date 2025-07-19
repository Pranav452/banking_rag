export interface Document {
  id: string
  title: string
  document_type: string
  file_path?: string
  version?: string
  effective_date?: string
  status: 'active' | 'inactive' | 'archived'
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  content: string
  embedding?: number[]
  chunk_index: number
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Query {
  id: string
  user_id?: string
  query_text: string
  response_text?: string
  sources?: Record<string, unknown>[]
  response_time_ms?: number
  feedback_score?: number
  created_at: string
}

export interface User {
  id: string
  email: string
  role: 'loan_officer' | 'compliance_analyst' | 'manager' | 'admin'
  department?: string
  permissions?: Record<string, unknown>
  created_at: string
  last_active: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: DocumentSource[]
  timestamp: string
}

export interface DocumentSource {
  document_id: string
  document_title: string
  chunk_content: string
  page_number?: number
  section?: string
  confidence_score?: number
}

export interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface BankingContext {
  loan_products?: string[]
  regulatory_context?: string[]
  user_role?: string
  current_rates?: Record<string, number>
} 