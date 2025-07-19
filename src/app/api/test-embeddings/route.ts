import { NextRequest, NextResponse } from 'next/server'
import { ollamaEmbeddings } from '@/lib/embeddings'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing embeddings and vector search...')

    // Test 1: Generate embeddings
    const testQuery = "loan eligibility requirements"
    const embedding = await ollamaEmbeddings.embedQuery(testQuery)
    console.log(`Generated embedding with ${embedding.length} dimensions`)

    // Test 2: Check database connection
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('id, title, document_type')
      .limit(5)

    if (docsError) {
      console.error('Database error:', docsError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: docsError.message 
      }, { status: 500 })
    }

    console.log(`Found ${documents?.length || 0} documents in database`)

    // Test 3: Check document chunks
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .select('id, document_id, content')
      .limit(5)

    if (chunksError) {
      console.error('Chunks error:', chunksError)
      return NextResponse.json({ 
        error: 'Failed to fetch chunks', 
        details: chunksError.message 
      }, { status: 500 })
    }

    console.log(`Found ${chunks?.length || 0} chunks in database`)

    // Test 4: Test vector search function
    let vectorResults = null
    try {
      const { data: vectorData, error: vectorError } = await supabaseAdmin.rpc('match_documents', {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.1, // Lower threshold for testing
        match_count: 3
      })

      if (vectorError) {
        console.error('Vector search error:', vectorError)
      } else {
        vectorResults = vectorData
        console.log(`Vector search returned ${vectorData?.length || 0} results`)
      }
    } catch (error) {
      console.error('Vector search failed:', error)
    }

    return NextResponse.json({
      success: true,
      results: {
        embeddingGenerated: embedding.length > 0,
        embeddingDimensions: embedding.length,
        documentsInDB: documents?.length || 0,
        chunksInDB: chunks?.length || 0,
        vectorSearchResults: vectorResults?.length || 0,
        sampleDocuments: documents?.map(d => ({ id: d.id, title: d.title })) || [],
        sampleChunks: chunks?.map(c => ({ 
          id: c.id, 
          content: c.content?.substring(0, 100) + '...' 
        })) || [],
        vectorResults: vectorResults || 'Failed'
      }
    })

  } catch (error) {
    console.error('Test failed:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 