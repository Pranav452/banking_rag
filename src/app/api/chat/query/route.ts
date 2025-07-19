import { NextRequest, NextResponse } from 'next/server'
import { bankingRAG, complianceRAG, loanCalculatorRAG } from '@/lib/rag-chains'
import { BankingContext } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    // No authentication required - direct access

    // Parse request body
    const { 
      question, 
      context, 
      queryType = 'general',
      loanAmount,
      loanTerm,
      loanType,
      regulations
    } = await request.json()

    // Validate inputs
    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    if (question.length > 1000) {
      return NextResponse.json({ error: 'Question too long' }, { status: 400 })
    }

    // Build banking context (no authentication required)
    const bankingContext: BankingContext = {
      user_role: 'banking_professional', // Default role when no auth
      ...context
    }

    let result

    // Route to appropriate RAG chain based on query type
    switch (queryType) {
      case 'compliance':
        if (!regulations || regulations.length === 0) {
          return NextResponse.json(
            { error: 'Regulations must be specified for compliance queries' },
            { status: 400 }
          )
        }
        result = await complianceRAG.checkCompliance(question, regulations)
        break

      case 'loan_calculation':
        if (!loanAmount || !loanTerm || !loanType) {
          return NextResponse.json(
            { error: 'Loan amount, term, and type are required for loan calculations' },
            { status: 400 }
          )
        }
        result = await loanCalculatorRAG.calculateLoan(loanType, loanAmount, loanTerm)
        break

      case 'general':
      default:
        result = await bankingRAG.queryWithContext(question, bankingContext)
        break
    }

    // Log successful query
    console.log(`Query processed: ${question.substring(0, 50)}...`)

    return NextResponse.json({
      success: true,
      result,
      queryType,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat query error:', error)
    
    // Return appropriate error based on the error type
    if (error instanceof Error) {
      if (error.message.includes('Ollama')) {
        return NextResponse.json(
          { error: 'Local embedding service unavailable. Please ensure Ollama is running.' },
          { status: 503 }
        )
      }
      
      if (error.message.includes('Groq')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please try again.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process query. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // No authentication required - return empty history for now
    return NextResponse.json({
      queries: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    })

  } catch (error) {
    console.error('Query history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch query history' },
      { status: 500 }
    )
  }
} 