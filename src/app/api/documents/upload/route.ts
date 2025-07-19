import { NextRequest, NextResponse } from 'next/server'
import { documentProcessor } from '@/lib/document-processor'

export async function POST(request: NextRequest) {
  try {
    // No authentication required - direct access

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string
    const version = formData.get('version') as string
    const effectiveDate = formData.get('effectiveDate') as string

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
        { status: 400 }
      )
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Prepare metadata
    const metadata = {
      uploaded_by: 'anonymous', // No authentication required
      file_size: file.size,
      file_type: file.type,
      version: version || '1.0',
      effective_date: effectiveDate || new Date().toISOString().split('T')[0]
    }

    // Process the document
    console.log(`Processing document: ${file.name}`)
    const documentId = await documentProcessor.processDocument(
      fileBuffer,
      file.name,
      documentType,
      metadata
    )

    console.log(`Document processed successfully: ${documentId}`)

    return NextResponse.json({
      success: true,
      documentId,
      message: 'Document uploaded and processed successfully'
    })

  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // No authentication required - return empty documents list for now
    return NextResponse.json({
      documents: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    })

  } catch (error) {
    console.error('Document list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
} 