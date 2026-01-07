/**
 * Chat Assistant Hook
 * Manages chat state and API communication
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface UseChatAssistantReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (message: string) => Promise<void>
  clearMessages: () => void
}

// Error type constants for better error handling
enum ChatErrorType {
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN = 'UNKNOWN',
}

function categorizeError(error: any, response?: Response): ChatErrorType {
  // Check response status first
  if (response) {
    if (response.status === 401) return ChatErrorType.UNAUTHORIZED
    if (response.status === 429) return ChatErrorType.RATE_LIMIT
  }

  // Check error message patterns
  const errorMessage = error?.message?.toLowerCase() || ''
  
  if (errorMessage.includes('session') || errorMessage.includes('log in')) {
    return ChatErrorType.SESSION_EXPIRED
  }
  
  if (errorMessage.includes('rate limit')) {
    return ChatErrorType.RATE_LIMIT
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
    return ChatErrorType.NETWORK
  }
  
  return ChatErrorType.UNKNOWN
}

function getErrorMessage(errorType: ChatErrorType): string {
  switch (errorType) {
    case ChatErrorType.SESSION_EXPIRED:
    case ChatErrorType.UNAUTHORIZED:
      return 'Sesja wygasła. Zaloguj się ponownie.'
    case ChatErrorType.RATE_LIMIT:
      return 'Zbyt wiele zapytań. Poczekaj chwilę i spróbuj ponownie.'
    case ChatErrorType.NETWORK:
      return 'Problem z połączeniem. Sprawdź internet i spróbuj ponownie.'
    case ChatErrorType.UNKNOWN:
    default:
      return 'Nie udało się wysłać wiadomości. Spróbuj ponownie.'
  }
}

export function useChatAssistant(): UseChatAssistantReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Session expired - please log in again')
      }

      // Prepare conversation history for API
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Call API
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message,
          conversationHistory,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get response from AI')
      }

      const data = await response.json()

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      console.error('Error sending message:', err)
      
      // Categorize and sanitize error
      let response: Response | undefined
      if (err instanceof Response) {
        response = err
      }
      
      const errorType = categorizeError(err, response)
      const userMessage = getErrorMessage(errorType)
      
      setError(userMessage)

      // Add user-friendly error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Przepraszam, ${userMessage.toLowerCase()}`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  }
}
