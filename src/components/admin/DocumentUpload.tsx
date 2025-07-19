'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
  progress: number
}

export default function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')
  const [version, setVersion] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    message: '',
    progress: 0
  })

  const documentTypes = [
    { value: 'loan_handbook', label: 'Loan Handbook' },
    { value: 'regulatory_manual', label: 'Regulatory Manual' },
    { value: 'policy_document', label: 'Policy Document' },
    { value: 'rate_sheet', label: 'Rate Sheet' },
    { value: 'compliance_matrix', label: 'Compliance Matrix' },
    { value: 'form', label: 'Form/Template' }
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ]
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setUploadStatus({
          status: 'error',
          message: 'Please upload PDF, DOCX, DOC, or TXT files only',
          progress: 0
        })
        return
      }

      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setUploadStatus({
          status: 'error',
          message: 'File size must be less than 10MB',
          progress: 0
        })
        return
      }

      setFile(selectedFile)
      setUploadStatus({ status: 'idle', message: '', progress: 0 })
    }
  }

  const handleUpload = async () => {
    if (!file || !documentType) {
      setUploadStatus({
        status: 'error',
        message: 'Please select a file and document type',
        progress: 0
      })
      return
    }

    setUploadStatus({
      status: 'uploading',
      message: 'Processing document...',
      progress: 0
    })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      formData.append('version', version || '1.0')
      formData.append('effectiveDate', effectiveDate || new Date().toISOString().split('T')[0])

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadStatus(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 500)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      setUploadStatus({
        status: 'success',
        message: `Document uploaded successfully! ID: ${result.documentId}`,
        progress: 100
      })

      // Reset form
      setFile(null)
      setDocumentType('')
      setVersion('')
      setEffectiveDate('')
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
        progress: 0
      })
    }
  }

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Upload className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Banking Document</h2>
        <p className="text-gray-600">
          Upload loan handbooks, regulatory manuals, policy documents, rate sheets, and other banking materials.
        </p>
      </div>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
            Select Document
          </label>
          <div className="relative">
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              className="w-full justify-start"
            >
              <FileText className="w-4 h-4 mr-2" />
              {file ? file.name : 'Choose file...'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: PDF, DOCX, DOC, TXT (max 10MB)
          </p>
        </div>

        {/* Document Type */}
        <div>
          <label htmlFor="document-type" className="block text-sm font-medium text-gray-700 mb-2">
            Document Type *
          </label>
          <select
            id="document-type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select document type...</option>
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Version */}
        <div>
          <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
            Version
          </label>
          <Input
            id="version"
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g., 2.1, v3.0"
          />
        </div>

        {/* Effective Date */}
        <div>
          <label htmlFor="effective-date" className="block text-sm font-medium text-gray-700 mb-2">
            Effective Date
          </label>
          <Input
            id="effective-date"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>

        {/* Upload Status */}
        {uploadStatus.status !== 'idle' && (
          <div className="p-4 rounded-md border">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${
                uploadStatus.status === 'success' ? 'text-green-800' :
                uploadStatus.status === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {uploadStatus.message}
              </span>
            </div>
            
            {uploadStatus.status === 'uploading' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || !documentType || uploadStatus.status === 'uploading'}
          className="w-full"
        >
          {uploadStatus.status === 'uploading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      </div>

      {/* Document Type Descriptions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Document Type Descriptions:</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div><strong>Loan Handbook:</strong> Documents with amortization tables and loan product details</div>
          <div><strong>Regulatory Manual:</strong> Compliance documents with multi-page matrices</div>
          <div><strong>Policy Document:</strong> Internal policies mixing narrative text with structured tables</div>
          <div><strong>Rate Sheet:</strong> Current pricing tables and interconnected rate information</div>
          <div><strong>Compliance Matrix:</strong> Regulatory requirement mappings and checklists</div>
          <div><strong>Form/Template:</strong> Fillable forms and document templates</div>
        </div>
      </div>
    </div>
  )
} 