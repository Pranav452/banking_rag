import DocumentUpload from '@/components/admin/DocumentUpload'
import Link from 'next/link'
import { MessageCircle, ArrowLeft } from 'lucide-react'

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      {/* Navigation */}
      <div className="container mx-auto px-4 mb-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <MessageCircle className="w-4 h-4" />
            Banking Assistant
          </Link>
        </div>
      </div>
      
      <div className="container mx-auto px-4">
        <DocumentUpload />
      </div>
    </main>
  )
} 