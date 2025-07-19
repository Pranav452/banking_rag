import { NextRequest, NextResponse } from 'next/server'
import { BankingVectorRetriever } from '@/lib/rag-chains'

export async function GET() {
  try {
    console.log('Testing BankingVectorRetriever...')

    const retriever = new BankingVectorRetriever(0.5, 5) // Lower threshold
    
    const testQueries = [
      "loan eligibility requirements",
      "mortgage information", 
      "can i take loan",
      "interest rates"
    ]

    const results = []

    for (const query of testQueries) {
      try {
        console.log(`Testing query: "${query}"`)
        const docs = await retriever._getRelevantDocuments(query)
        console.log(`Found ${docs.length} documents for "${query}"`)
        
        results.push({
          query,
          documentCount: docs.length,
          documents: docs.map(doc => ({
            content: doc.pageContent.substring(0, 200) + '...',
            metadata: doc.metadata,
            similarity: doc.metadata.similarity
          }))
        })
      } catch (error) {
        console.error(`Error for query "${query}":`, error)
        results.push({
          query,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      retrieverResults: results
    })

  } catch (error) {
    console.error('Retriever test failed:', error)
    return NextResponse.json({ 
      error: 'Retriever test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 