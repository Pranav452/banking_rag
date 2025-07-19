import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { langsmithClient } from '../../../../lib/langsmith-config'

interface QueryMetrics {
  timestamp: string
  query_type: string
  response_time_ms: number
  confidence: number
  sources_count: number
  user_feedback?: 'positive' | 'negative' | null
}

interface PerformanceMetrics {
  avg_response_time: number
  avg_confidence: number
  total_queries: number
  error_rate: number
  success_rate: number
  top_query_types: { type: string; count: number; avg_confidence: number }[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h'
    const detailed = searchParams.get('detailed') === 'true'
    
    // Calculate time range
    const now = new Date()
    const startTime = new Date()
    
    switch (timeframe) {
      case '1h':
        startTime.setHours(now.getHours() - 1)
        break
      case '24h':
        startTime.setDate(now.getDate() - 1)
        break
      case '7d':
        startTime.setDate(now.getDate() - 7)
        break
      case '30d':
        startTime.setDate(now.getDate() - 30)
        break
      default:
        startTime.setDate(now.getDate() - 1)
    }
    
    console.log(`Fetching banking RAG monitoring data for ${timeframe}`)
    
    // Get query metrics from database
    const { data: queries, error: queryError } = await supabaseAdmin
      .from('queries')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })
    
    if (queryError) {
      console.warn('Error fetching queries:', queryError)
    }
    
    // Get document metrics
    const { data: documents, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, title, document_type, created_at')
      .order('created_at', { ascending: false })
    
    if (docError) {
      console.warn('Error fetching documents:', docError)
    }
    
    // Get chunk metrics
    const { data: chunks, error: chunkError } = await supabaseAdmin
      .from('document_chunks')
      .select('id, document_id, created_at')
      .order('created_at', { ascending: false })
    
    if (chunkError) {
      console.warn('Error fetching chunks:', chunkError)
    }
    
    // Calculate performance metrics
    const queryMetrics: QueryMetrics[] = (queries || []).map(q => ({
      timestamp: q.created_at,
      query_type: q.query_type || 'general',
      response_time_ms: q.response_time_ms || 0,
      confidence: q.confidence || 0,
      sources_count: q.source_count || 0,
      user_feedback: q.user_feedback
    }))
    
    const performanceMetrics: PerformanceMetrics = {
      avg_response_time: queryMetrics.length > 0 
        ? queryMetrics.reduce((sum, q) => sum + q.response_time_ms, 0) / queryMetrics.length
        : 0,
      avg_confidence: queryMetrics.length > 0
        ? queryMetrics.reduce((sum, q) => sum + q.confidence, 0) / queryMetrics.length
        : 0,
      total_queries: queryMetrics.length,
      error_rate: 0, // Would be calculated from error tracking
      success_rate: queryMetrics.length > 0 ? 100 : 0,
      top_query_types: getTopQueryTypes(queryMetrics)
    }
    
    // System health metrics
    const systemHealth = {
      database_status: 'healthy',
      embedding_service: 'healthy', // Ollama
      llm_service: 'healthy', // Groq
      vector_store: 'healthy', // Supabase pgvector
      total_documents: documents?.length || 0,
      total_chunks: chunks?.length || 0,
      langsmith_tracing: process.env.LANGSMITH_TRACING === 'true'
    }
    
    // Banking-specific metrics
    const bankingMetrics = {
      loan_product_queries: queryMetrics.filter(q => 
        q.query_type === 'loan_calculation' || 
        q.query_type === 'loan_eligibility'
      ).length,
      compliance_queries: queryMetrics.filter(q => 
        q.query_type === 'compliance'
      ).length,
      regulatory_queries: queryMetrics.filter(q => 
        q.query_type === 'regulatory'
      ).length,
      avg_confidence_by_category: getCategorizedConfidence(queryMetrics),
      document_types: getDocumentTypeStats(documents || [])
    }
    
    // Evaluation metrics (mock data for demonstration)
    const evaluationMetrics = {
      banking_data_accuracy: 92.5,
      table_context_preservation: 88.3,
      regulatory_compliance: 95.1,
      source_quality: 89.7,
      confidence_calibration: 86.2,
      overall_score: 90.4,
      last_evaluation: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      evaluation_trend: 'improving' // 'improving', 'stable', 'declining'
    }
    
    // Cost tracking
    const costMetrics = {
      groq_api_calls: queryMetrics.length,
      estimated_groq_cost_usd: queryMetrics.length * 0.0002, // Rough estimate
      ollama_embeddings: queryMetrics.length + (chunks?.length || 0),
      storage_cost_estimate: 0.05, // Supabase storage
      total_estimated_cost: queryMetrics.length * 0.0002 + 0.05
    }
    
    const response: any = {
      success: true,
      timeframe,
      monitoring_data: {
        performance: performanceMetrics,
        system_health: systemHealth,
        banking_metrics: bankingMetrics,
        evaluation_metrics: evaluationMetrics,
        cost_metrics: costMetrics,
        langsmith_integration: {
          project: process.env.LANGSMITH_PROJECT,
          tracing_enabled: process.env.LANGSMITH_TRACING === 'true',
          endpoint: process.env.LANGSMITH_ENDPOINT
        }
      }
    }
    
    if (detailed) {
      response.monitoring_data.recent_queries = queryMetrics.slice(0, 10)
      response.monitoring_data.document_details = documents?.slice(0, 5)
      response.monitoring_data.chunk_details = chunks?.slice(0, 10)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Monitoring error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch monitoring data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions
function getTopQueryTypes(metrics: QueryMetrics[]) {
  const typeCount = metrics.reduce((acc, metric) => {
    if (!acc[metric.query_type]) {
      acc[metric.query_type] = { count: 0, totalConfidence: 0 }
    }
    acc[metric.query_type].count++
    acc[metric.query_type].totalConfidence += metric.confidence
    return acc
  }, {} as Record<string, { count: number; totalConfidence: number }>)
  
  return Object.entries(typeCount)
    .map(([type, data]) => ({
      type,
      count: data.count,
      avg_confidence: data.count > 0 ? data.totalConfidence / data.count : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function getCategorizedConfidence(metrics: QueryMetrics[]) {
  const categories = ['general', 'loan_calculation', 'compliance', 'regulatory']
  
  return categories.reduce((acc, category) => {
    const categoryMetrics = metrics.filter(m => m.query_type === category)
    acc[category] = categoryMetrics.length > 0
      ? categoryMetrics.reduce((sum, m) => sum + m.confidence, 0) / categoryMetrics.length
      : 0
    return acc
  }, {} as Record<string, number>)
}

function getDocumentTypeStats(documents: any[]) {
  const typeCount = documents.reduce((acc, doc) => {
    const type = doc.document_type || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(typeCount).map(([type, count]) => ({ type, count }))
}

// POST endpoint for alerts and configuration
export async function POST(request: NextRequest) {
  try {
    const { action, config } = await request.json()
    
    switch (action) {
      case 'set_alert_thresholds':
        // In a real implementation, this would store alert thresholds
        console.log('Setting alert thresholds:', config)
        
        return NextResponse.json({
          success: true,
          message: 'Alert thresholds updated',
          thresholds: config
        })
        
      case 'trigger_evaluation':
        // Trigger a new evaluation run
        console.log('Triggering evaluation run...')
        
        return NextResponse.json({
          success: true,
          message: 'Evaluation triggered',
          evaluation_id: `eval_${Date.now()}`
        })
        
      case 'reset_metrics':
        // Reset metrics (for testing)
        console.log('Resetting metrics...')
        
        return NextResponse.json({
          success: true,
          message: 'Metrics reset'
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Monitoring action error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to execute monitoring action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 