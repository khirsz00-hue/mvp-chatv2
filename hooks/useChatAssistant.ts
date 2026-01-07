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
      
      // Sanitize error message for user display
      let userMessage = 'Nie udało się wysłać wiadomości. Spróbuj ponownie.'
      
      if (err.message?.includes('Session expired') || err.message?.includes('log in')) {
        userMessage = 'Sesja wygasła. Zaloguj się ponownie.'
      } else if (err.message?.includes('Rate limit')) {
        userMessage = 'Zbyt wiele zapytań. Poczekaj chwilę i spróbuj ponownie.'
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        userMessage = 'Problem z połączeniem. Sprawdź internet i spróbuj ponownie.'
      }
      
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
