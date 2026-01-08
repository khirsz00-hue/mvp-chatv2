/**
 * Chat Stream Hook
 * Handles streaming responses from the chat assistant API
 */

import { useState } from 'react'

export interface UseChatStreamReturn {
  isStreaming: boolean
  streamMessage: (
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    token: string,
    onChunk: (text: string) => void
  ) => Promise<void>
}

export function useChatStream(): UseChatStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)

  const streamMessage = async (
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    token: string,
    onChunk: (text: string) => void
  ) => {
    setIsStreaming(true)

    try {
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, conversationHistory })
      })

      if (!response.ok) {
        throw new Error(`Failed to stream: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                onChunk(parsed.text)
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return { streamMessage, isStreaming }
}
