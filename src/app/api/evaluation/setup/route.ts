import { NextRequest, NextResponse } from 'next/server'
import { 
  createLangSmithDataset, 
  completeBankingDataset, 
  getDatasetStats,
  loanProductsDataset,
  regulatoryComplianceDataset,
  tableCrossReferencesDataset
} from '../../../../lib/evaluation/banking-datasets'
import { 
  bankingDataAccuracyEvaluator,
  tableContextPreservationEvaluator,
  regulatoryComplianceEvaluator,
  sourceQualityEvaluator,
  confidenceCalibrationEvaluator,
  runBankingEvaluation
} from '../../../../lib/evaluation/banking-evaluators'
import { BankingRAGChain } from '../../../../lib/rag-chains'

export async function GET(request: NextRequest) {
  try {
    console.log('Setting up LangSmith Banking RAG Evaluation System...')
    
    // Get dataset statistics
    const stats = getDatasetStats()
    
    return NextResponse.json({
      success: true,
      message: 'Banking RAG Evaluation System Ready',
      evaluation_framework: {
        langsmith_integration: {
          status: 'configured',
          project: process.env.LANGSMITH_PROJECT,
          endpoint: process.env.LANGSMITH_ENDPOINT,
          tracing_enabled: process.env.LANGSMITH_TRACING === 'true'
        },
        datasets: {
          loan_products: stats.loan_products,
          regulatory_compliance: stats.regulatory_compliance,
          table_cross_references: stats.table_cross_references,
          total_questions: stats.total
        },
        evaluators: [
          {
            name: 'Banking Data Accuracy',
            description: 'Validates accuracy of banking information (rates, amounts, terms)',
            criteria: ['contains_age_requirement', 'contains_specific_rates', 'mentions_premier_exclusive']
          },
          {
            name: 'Table Context Preservation',
            description: 'Ensures table data and structure are preserved after chunking',
            criteria: ['references_table_sources', 'preserves_numerical_data', 'maintains_structure']
          },
          {
            name: 'Regulatory Compliance',
            description: 'Validates regulatory language and compliance determination',
            criteria: ['uses_regulatory_language', 'references_regulations', 'provides_compliance_determination']
          },
          {
            name: 'Source Quality',
            description: 'Evaluates relevance and diversity of retrieved sources',
            criteria: ['minimum_source_count', 'source_relevance', 'source_diversity']
          },
          {
            name: 'Confidence Calibration',
            description: 'Ensures confidence scores are well-calibrated',
            criteria: ['meets_minimum_confidence', 'calibrated_with_sources']
          }
        ],
        monitoring: {
          real_time_tracing: 'enabled',
          error_tracking: 'enabled',
          performance_metrics: 'enabled',
          cost_tracking: 'enabled'
        }
      },
      sample_evaluations: [
        {
          question: "What is the minimum age requirement for a mortgage application?",
          expected_criteria: ['contains_age_requirement', 'references_mortgage_policy'],
          expected_confidence_min: 80,
          category: 'loan_eligibility'
        },
        {
          question: "Are mortgages available for business purposes?",
          expected_criteria: ['explicitly_states_not_available', 'references_business_purpose_restriction'],
          expected_confidence_min: 90,
          category: 'mortgage_compliance'
        },
        {
          question: "What are the Early Repayment Charges mentioned in the rate table?",
          expected_criteria: ['contains_specific_percentages', 'references_table_data'],
          expected_confidence_min: 80,
          category: 'table_reference'
        }
      ]
    })
    
  } catch (error) {
    console.error('Evaluation setup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to set up evaluation system',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, dataset_name } = await request.json()
    
    switch (action) {
      case 'create_datasets':
        console.log('Creating LangSmith datasets...')
        
        // Create individual datasets
        const loanDataset = await createLangSmithDataset('banking-loan-products', loanProductsDataset)
        const complianceDataset = await createLangSmithDataset('banking-regulatory-compliance', regulatoryComplianceDataset)
        const tableDataset = await createLangSmithDataset('banking-table-references', tableCrossReferencesDataset)
        const completeDataset = await createLangSmithDataset('banking-rag-complete', completeBankingDataset)
        
        return NextResponse.json({
          success: true,
          message: 'LangSmith datasets created successfully',
          datasets: {
            loan_products: loanDataset.id,
            regulatory_compliance: complianceDataset.id,
            table_references: tableDataset.id,
            complete_evaluation: completeDataset.id
          }
        })
        
      case 'run_evaluation':
        console.log(`Running evaluation on dataset: ${dataset_name}`)
        
        // Initialize RAG chain
        const ragChain = new BankingRAGChain()
        
        // Run evaluation
        const results = await runBankingEvaluation(dataset_name || 'banking-rag-complete', ragChain)
        
        return NextResponse.json({
          success: true,
          message: 'Banking RAG evaluation completed',
          results
        })
        
      case 'sample_evaluation':
        console.log('Running sample evaluation...')
        
        // Initialize RAG chain
        const sampleRagChain = new BankingRAGChain()
        
        // Test a few sample questions
        const sampleQuestions = [
          "What is the minimum age requirement for a mortgage application?",
          "Are mortgages available for business purposes?",
          "What is the minimum and maximum loan amount for Premier Exclusive products?"
        ]
        
        const sampleResults = []
        
        for (const question of sampleQuestions) {
          const startTime = Date.now()
          const result = await sampleRagChain.queryWithContext(question)
          const endTime = Date.now()
          
          // Run evaluators
          const mockRun = { outputs: result }
          const mockExample = { 
            outputs: { 
              expected_answer: 'Sample expected answer',
              expected_confidence_min: 70,
              expected_sources_min: 1,
              evaluation_criteria: ['contains_age_requirement']
            }
          }
          
          const accuracy = await bankingDataAccuracyEvaluator(mockRun, mockExample)
          const sources = await sourceQualityEvaluator(mockRun, mockExample)
          
          sampleResults.push({
            question,
            answer: result.answer,
            confidence: result.confidence,
            sources_count: result.sources.length,
            response_time_ms: endTime - startTime,
            evaluations: {
              accuracy_score: accuracy.score,
              source_quality_score: sources.score,
              accuracy_feedback: accuracy.comment,
              source_feedback: sources.comment
            }
          })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Sample evaluation completed',
          sample_results: sampleResults,
          summary: {
            avg_confidence: sampleResults.reduce((sum, r) => sum + r.confidence, 0) / sampleResults.length,
            avg_response_time: sampleResults.reduce((sum, r) => sum + r.response_time_ms, 0) / sampleResults.length,
            avg_accuracy: sampleResults.reduce((sum, r) => sum + r.evaluations.accuracy_score, 0) / sampleResults.length,
            avg_source_quality: sampleResults.reduce((sum, r) => sum + r.evaluations.source_quality_score, 0) / sampleResults.length
          }
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Evaluation action error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to execute evaluation action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 