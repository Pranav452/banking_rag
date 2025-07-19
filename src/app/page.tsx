import ChatInterface from '@/components/chat/ChatInterface'
import Link from 'next/link'
import { Upload } from 'lucide-react'

export default function Home() {
  return (
    <main className="h-screen relative">
      {/* Navigation */}
      <div className="absolute top-4 right-4 z-10">
        <Link href="/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Upload className="w-4 h-4" />
          Upload Documents
        </Link>
      </div>
      
      <ChatInterface userRole="loan_officer" />
    </main>
  )
}
