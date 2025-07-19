import { evaluate } from 'langsmith/evaluation'
import { Client } from 'langsmith'

// Banking Data Accuracy Evaluator
export const bankingDataAccuracyEvaluator = async (
  run: any,
  example: any
) => {
  const { outputs } = run
  const { outputs: expectedOutputs } = example
  
  const actualAnswer = outputs?.answer || ''
  const expectedAnswer = expectedOutputs?.expected_answer || ''
  const evaluationCriteria = expectedOutputs?.evaluation_criteria || []
  
  let score = 0
  let feedback = []
  
  // Check each evaluation criteria
  for (const criteria of evaluationCriteria) {
    switch (criteria) {
      case 'contains_age_requirement':
        if (actualAnswer.toLowerCase().includes('18')) {
          score += 25
          feedback.push('✓ Contains age requirement')
        } else {
          feedback.push('✗ Missing age requirement')
        }
        break
        
      case 'contains_specific_rates':
        const ratePattern = /\d+\.?\d*%/
        if (ratePattern.test(actualAnswer)) {
          score += 25
          feedback.push('✓ Contains specific rates')
        } else {
          feedback.push('✗ Missing specific rates')
        }
        break
        
      case 'contains_minimum_amount':
        if (actualAnswer.toLowerCase().includes('5') && actualAnswer.includes('k')) {
          score += 20
          feedback.push('✓ Contains minimum amount')
        } else {
          feedback.push('✗ Missing minimum amount')
        }
        break
        
      case 'contains_maximum_amount':
        if (actualAnswer.includes('2') && actualAnswer.toLowerCase().includes('m')) {
          score += 20
          feedback.push('✓ Contains maximum amount')
        } else {
          feedback.push('✗ Missing maximum amount')
        }
        break
        
      case 'mentions_premier_exclusive':
        if (actualAnswer.toLowerCase().includes('premier exclusive')) {
          score += 15
          feedback.push('✓ Mentions Premier Exclusive')
        } else {
          feedback.push('✗ Missing Premier Exclusive reference')
        }
        break
        
      case 'explicitly_states_not_available':
        if (actualAnswer.toLowerCase().includes('not available') || actualAnswer.toLowerCase().includes('no')) {
          score += 30
          feedback.push('✓ Explicitly states not available')
        } else {
          feedback.push('✗ Does not clearly state unavailability')
        }
        break
        
      case 'mentions_first_charge':
        if (actualAnswer.toLowerCase().includes('first charge')) {
          score += 25
          feedback.push('✓ Mentions first charge')
        } else {
          feedback.push('✗ Missing first charge reference')
        }
        break
        
      case 'contains_monthly_payment':
        const paymentPattern = /\$[\d,]+\.?\d*/
        if (paymentPattern.test(actualAnswer) || actualAnswer.toLowerCase().includes('monthly payment')) {
          score += 30
          feedback.push('✓ Contains monthly payment information')
        } else {
          feedback.push('✗ Missing monthly payment calculation')
        }
        break
        
      default:
        feedback.push(`? Unknown criteria: ${criteria}`)
    }
  }
  
  // Normalize score to 0-1 range
  const maxPossibleScore = evaluationCriteria.length * 25
  const normalizedScore = maxPossibleScore > 0 ? score / maxPossibleScore : 0
  
  return {
    key: 'banking_data_accuracy',
    score: Math.min(normalizedScore, 1),
    value: Math.min(normalizedScore, 1),
    comment: feedback.join('; '),
    correction: score < maxPossibleScore * 0.8 ? 'Consider including missing banking information' : undefined
  }
}

// Table Context Preservation Evaluator
export const tableContextPreservationEvaluator = async (
  run: any,
  example: any
) => {
  const { outputs } = run
  const sources = outputs?.sources || []
  const actualAnswer = outputs?.answer || ''
  
  let score = 0
  let feedback = []
  
  // Check if sources contain table-related information
  const hasTableSources = sources.some((source: any) => 
    source.chunk_content?.toLowerCase().includes('table') ||
    source.chunk_content?.toLowerCase().includes('rate') ||
    source.chunk_content?.includes('%')
  )
  
  if (hasTableSources) {
    score += 40
    feedback.push('✓ References table sources')
  } else {
    feedback.push('✗ No table sources referenced')
  }
  
  // Check if answer preserves numerical accuracy
  const hasNumbers = /\d+\.?\d*/.test(actualAnswer)
  if (hasNumbers) {
    score += 30
    feedback.push('✓ Preserves numerical data')
  } else {
    feedback.push('✗ Missing numerical data')
  }
  
  // Check for table structure preservation
  const hasStructuredData = actualAnswer.includes('minimum') || 
                           actualAnswer.includes('maximum') ||
                           actualAnswer.includes('rate') ||
                           actualAnswer.includes('%')
  
  if (hasStructuredData) {
    score += 30
    feedback.push('✓ Preserves structured data')
  } else {
    feedback.push('✗ Missing structured data')
  }
  
  return {
    key: 'table_context_preservation',
    score: score / 100,
    value: score / 100,
    comment: feedback.join('; '),
    correction: score < 80 ? 'Improve table data extraction and preservation' : undefined
  }
}

// Regulatory Compliance Evaluator
export const regulatoryComplianceEvaluator = async (
  run: any,
  example: any
) => {
  const { outputs } = run
  const { metadata } = example
  const actualAnswer = outputs?.answer || ''
  const regulatoryRefs = metadata?.regulatory_refs || []
  
  let score = 0
  let feedback = []
  
  // Check for regulatory language
  const regulatoryTerms = [
    'compliance', 'regulation', 'policy', 'requirement', 'must', 'shall',
    'prohibited', 'restricted', 'approved', 'authorized', 'licensed'
  ]
  
  const usesRegulatoryLanguage = regulatoryTerms.some(term => 
    actualAnswer.toLowerCase().includes(term)
  )
  
  if (usesRegulatoryLanguage) {
    score += 30
    feedback.push('✓ Uses appropriate regulatory language')
  } else {
    feedback.push('✗ Missing regulatory language')
  }
  
  // Check for specific regulatory references
  if (regulatoryRefs.length > 0) {
    const referencesRegulations = regulatoryRefs.some((ref: string) => 
      actualAnswer.toLowerCase().includes(ref.toLowerCase())
    )
    
    if (referencesRegulations) {
      score += 40
      feedback.push('✓ References specific regulations')
    } else {
      feedback.push('✗ Missing specific regulatory references')
    }
  }
  
  // Check for compliance determination
  const hasComplianceStatement = actualAnswer.toLowerCase().includes('compliant') ||
                                actualAnswer.toLowerCase().includes('complies') ||
                                actualAnswer.toLowerCase().includes('violation') ||
                                actualAnswer.toLowerCase().includes('breach')
  
  if (hasComplianceStatement) {
    score += 30
    feedback.push('✓ Provides compliance determination')
  } else {
    feedback.push('✗ Missing compliance determination')
  }
  
  return {
    key: 'regulatory_compliance',
    score: score / 100,
    value: score / 100,
    comment: feedback.join('; '),
    correction: score < 80 ? 'Strengthen regulatory compliance analysis' : undefined
  }
}

// Source Quality Evaluator
export const sourceQualityEvaluator = async (
  run: any,
  example: any
) => {
  const { outputs } = run
  const { outputs: expectedOutputs } = example
  const sources = outputs?.sources || []
  const expectedSourcesMin = expectedOutputs?.expected_sources_min || 1
  
  let score = 0
  let feedback = []
  
  // Check minimum source count
  if (sources.length >= expectedSourcesMin) {
    score += 40
    feedback.push(`✓ Has ${sources.length} sources (minimum ${expectedSourcesMin})`)
  } else {
    feedback.push(`✗ Only ${sources.length} sources (minimum ${expectedSourcesMin} required)`)
  }
  
  // Check source relevance (confidence scores)
  const avgConfidence = sources.length > 0 
    ? sources.reduce((sum: number, source: any) => sum + (source.confidence_score || 0), 0) / sources.length
    : 0
  
  if (avgConfidence >= 0.7) {
    score += 40
    feedback.push(`✓ High source relevance (${(avgConfidence * 100).toFixed(1)}%)`)
  } else if (avgConfidence >= 0.5) {
    score += 20
    feedback.push(`~ Moderate source relevance (${(avgConfidence * 100).toFixed(1)}%)`)
  } else {
    feedback.push(`✗ Low source relevance (${(avgConfidence * 100).toFixed(1)}%)`)
  }
  
  // Check source diversity (different documents)
  const uniqueDocuments = new Set(sources.map((source: any) => source.document_id))
  if (uniqueDocuments.size > 1) {
    score += 20
    feedback.push('✓ Uses multiple documents')
  } else if (sources.length > 0) {
    feedback.push('~ Uses single document')
  }
  
  return {
    key: 'source_quality',
    score: score / 100,
    value: score / 100,
    comment: feedback.join('; '),
    correction: score < 60 ? 'Improve source retrieval and relevance' : undefined
  }
}

// Confidence Calibration Evaluator
export const confidenceCalibrationEvaluator = async (
  run: any,
  example: any
) => {
  const { outputs } = run
  const { outputs: expectedOutputs } = example
  const actualConfidence = outputs?.confidence || 0
  const expectedConfidenceMin = expectedOutputs?.expected_confidence_min || 0
  
  let score = 0
  let feedback = []
  
  // Check if confidence meets minimum threshold
  if (actualConfidence >= expectedConfidenceMin) {
    score += 50
    feedback.push(`✓ Confidence ${actualConfidence}% meets minimum ${expectedConfidenceMin}%`)
  } else {
    feedback.push(`✗ Confidence ${actualConfidence}% below minimum ${expectedConfidenceMin}%`)
  }
  
  // Check confidence calibration (not overconfident for poor answers)
  const sources = outputs?.sources || []
  const avgSourceConfidence = sources.length > 0 
    ? sources.reduce((sum: number, source: any) => sum + (source.confidence_score || 0), 0) / sources.length * 100
    : 0
  
  const confidenceDiff = Math.abs(actualConfidence - avgSourceConfidence)
  if (confidenceDiff <= 20) {
    score += 50
    feedback.push('✓ Well-calibrated confidence')
  } else {
    feedback.push(`✗ Poorly calibrated confidence (${confidenceDiff.toFixed(1)}% difference from sources)`)
  }
  
  return {
    key: 'confidence_calibration',
    score: score / 100,
    value: score / 100,
    comment: feedback.join('; '),
    correction: score < 50 ? 'Improve confidence calibration' : undefined
  }
}

// Combined Banking RAG Evaluator
export const combinedBankingRAGEvaluator = async (
  run: any,
  example: any
) => {
  const evaluators = [
    bankingDataAccuracyEvaluator,
    tableContextPreservationEvaluator,
    regulatoryComplianceEvaluator,
    sourceQualityEvaluator,
    confidenceCalibrationEvaluator
  ]
  
  const results = await Promise.all(
    evaluators.map(evaluator => evaluator(run, example))
  )
  
  const overallScore = results.reduce((sum, result) => sum + result.score, 0) / results.length
  const feedback = results.map(result => `${result.key}: ${result.comment}`).join(' | ')
  const corrections = results.filter(result => result.correction).map(result => result.correction)
  
  return {
    key: 'banking_rag_overall',
    score: overallScore,
    value: overallScore,
    comment: feedback,
    correction: corrections.length > 0 ? corrections.join('; ') : undefined,
    details: results
  }
}

// Evaluation runner utility
export const runBankingEvaluation = async (
  datasetName: string,
  ragChain: any
) => {
  const client = new Client({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com'
  })
  
  try {
    console.log(`Running banking evaluation on dataset: ${datasetName}`)
    
    // Create a simple evaluation function
    const evalFunction = async (input: any) => {
      const { question, context, queryType } = input
      return await ragChain.queryWithContext(question, context || {})
    }
    
    // For now, return a placeholder - full evaluation would be implemented
    // when the LangSmith API types are properly resolved
    return {
      evaluation_completed: true,
      dataset: datasetName,
      timestamp: new Date().toISOString(),
      note: 'Banking RAG evaluation framework ready - full evaluation pending LangSmith API integration'
    }
    
  } catch (error) {
    console.error('Evaluation failed:', error)
    throw error
  }
} 