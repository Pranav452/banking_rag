'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatMessage, DocumentSource } from '@/types/database'
import { Send, FileText, Calculator, Scale, User, Bot } from 'lucide-react'

interface ChatInterfaceProps {
  userRole?: string
}

interface QueryResult {
  answer?: string
  sources?: DocumentSource[]
  confidence?: number
  compliant?: boolean
  issues?: string[]
  recommendations?: string[]
  monthlyPayment?: number
  totalInterest?: number
  rate?: number
  calculations?: string
}

export default function ChatInterface({ userRole = 'banking_professional' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Banking Knowledge Assistant. I can help you with loan products, regulatory compliance, policy questions, and calculations. What would you like to know?',
      timestamp: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [queryType, setQueryType] = useState<'general' | 'compliance' | 'loan_calculation'>('general')
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Advanced query options
  const [loanAmount, setLoanAmount] = useState('')
  const [loanTerm, setLoanTerm] = useState('')
  const [loanType, setLoanType] = useState('')
  const [regulations, setRegulations] = useState<string[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const payload: {
        question: string
        queryType: string
        context: { user_role: string }
        loanAmount?: number
        loanTerm?: number
        loanType?: string
        regulations?: string[]
      } = {
        question: input,
        queryType,
        context: {
          user_role: userRole
        }
      }

      // Add specific fields based on query type
      if (queryType === 'loan_calculation') {
        payload.loanAmount = parseFloat(loanAmount)
        payload.loanTerm = parseInt(loanTerm)
        payload.loanType = loanType
      } else if (queryType === 'compliance') {
        payload.regulations = regulations
      }

      const response = await fetch('/api/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      const result: QueryResult = data.result

      // Format the response based on query type
      let responseContent = ''
      let sources: DocumentSource[] = []

      if (queryType === 'compliance') {
        responseContent = formatComplianceResponse(result)
        sources = result.sources || []
      } else if (queryType === 'loan_calculation') {
        responseContent = formatLoanCalculationResponse(result)
        sources = result.sources || []
      } else {
        responseContent = result.answer || 'No response generated'
        sources = result.sources || []
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        sources,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const formatComplianceResponse = (result: QueryResult): string => {
    let response = ''
    
    if (result.compliant !== undefined) {
      response += `**Compliance Status:** ${result.compliant ? '✅ Compliant' : '❌ Non-Compliant'}\n\n`
    }
    
    if (result.issues && result.issues.length > 0) {
      response += '**Issues Identified:**\n'
      result.issues.forEach((issue, index) => {
        response += `${index + 1}. ${issue}\n`
      })
      response += '\n'
    }
    
    if (result.recommendations && result.recommendations.length > 0) {
      response += '**Recommendations:**\n'
      result.recommendations.forEach((rec, index) => {
        response += `${index + 1}. ${rec}\n`
      })
      response += '\n'
    }
    
    return response
  }

  const formatLoanCalculationResponse = (result: QueryResult): string => {
    let response = '**Loan Calculation Results:**\n\n'
    
    if (result.monthlyPayment) {
      response += `💰 **Monthly Payment:** $${result.monthlyPayment.toFixed(2)}\n`
    }
    
    if (result.totalInterest) {
      response += `📊 **Total Interest:** $${result.totalInterest.toFixed(2)}\n`
    }
    
    if (result.rate) {
      response += `📈 **Interest Rate:** ${result.rate}%\n\n`
    }
    
    if (result.calculations) {
      response += `**Detailed Calculations:**\n${result.calculations}`
    }
    
    return response
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getQueryTypeIcon = () => {
    switch (queryType) {
      case 'compliance':
        return <Scale className="w-4 h-4" />
      case 'loan_calculation':
        return <Calculator className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Banking Knowledge Assistant</h1>
            <p className="text-sm text-gray-600">Role: {userRole.replace('_', ' ').toUpperCase()}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Simple' : 'Advanced'} Mode
          </Button>
        </div>
        
        {/* Query Type Selector */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={queryType === 'general' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQueryType('general')}
            className="flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            General
          </Button>
          <Button
            variant={queryType === 'compliance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQueryType('compliance')}
            className="flex items-center gap-1"
          >
            <Scale className="w-3 h-3" />
            Compliance
          </Button>
          <Button
            variant={queryType === 'loan_calculation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQueryType('loan_calculation')}
            className="flex items-center gap-1"
          >
            <Calculator className="w-3 h-3" />
            Loan Calc
          </Button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            {queryType === 'loan_calculation' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Loan Amount ($)"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  type="number"
                />
                <Input
                  placeholder="Term (months)"
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(e.target.value)}
                  type="number"
                />
                <Input
                  placeholder="Loan Type"
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                />
              </div>
            )}
            {queryType === 'compliance' && (
              <div>
                <Input
                  placeholder="Regulations (comma-separated)"
                  value={regulations.join(', ')}
                  onChange={(e) => setRegulations(e.target.value.split(',').map(r => r.trim()))}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white ml-12'
                  : 'bg-white border border-gray-200 mr-12'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-blue-500' : 'bg-gray-100'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                      <div className="space-y-1">
                        {message.sources.map((source, index) => (
                          <div key={index} className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            <div className="font-medium">{source.document_title}</div>
                            <div className="truncate">{source.chunk_content}</div>
                            {source.confidence_score && (
                              <div className="text-gray-400">
                                Confidence: {Math.round(source.confidence_score * 100)}%
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mr-12">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Thinking...
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              {getQueryTypeIcon()}
            </div>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about loan products, regulations, or policies..."
              disabled={isLoading}
              className="pl-10"
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="flex items-center gap-1"
          >
            <Send className="w-4 h-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
} 