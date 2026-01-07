'use client'

import { useState, useRef, useEffect } from 'react'
import { X, PaperPlaneRight, Trash } from '@phosphor-icons/react'
import { useChatAssistant, ChatMessage } from '@/hooks/useChatAssistant'
import { toast } from 'sonner'

interface ChatAssistantProps {
  open: boolean
  onClose: () => void
}

export function ChatAssistant({ open, onClose }: ChatAssistantProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { messages, isLoading, sendMessage, clearMessages } = useChatAssistant()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const message = inputValue.trim()
    setInputValue('')

    try {
      await sendMessage(message)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Nie udało się wysłać wiadomości')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    clearMessages()
    toast.success('Czat wyczyszczony')
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-16 z-[101] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-4xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xl">
                💬
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
                <p className="text-xs text-gray-600">Zadania • Dziennik • Decyzje • Wzorce</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Wyczyść czat"
                >
                  <Trash size={20} className="text-gray-600" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Zamknij"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Cześć! Jestem twoim AI asystentem
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Mogę ci pomóc z zadaniami, priorytetami, decyzjami i analizą wzorców. 
                  Zapytaj mnie o cokolwiek!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <button
                    onClick={() => {
                      setInputValue('Jakie mam zadania na dziś?')
                      inputRef.current?.focus()
                    }}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm transition-colors"
                  >
                    <span className="font-medium">📋 Jakie mam zadania na dziś?</span>
                  </button>
                  <button
                    onClick={() => {
                      setInputValue('Co jest najważniejsze do zrobienia?')
                      inputRef.current?.focus()
                    }}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm transition-colors"
                  >
                    <span className="font-medium">⭐ Co jest najważniejsze?</span>
                  </button>
                  <button
                    onClick={() => {
                      setInputValue('Jak spałem ostatnio?')
                      inputRef.current?.focus()
                    }}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm transition-colors"
                  >
                    <span className="font-medium">😴 Jak spałem ostatnio?</span>
                  </button>
                  <button
                    onClick={() => {
                      setInputValue('Kiedy najlepiej zaplanować spotkanie?')
                      inputRef.current?.focus()
                    }}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm transition-colors"
                  >
                    <span className="font-medium">📅 Kiedy zaplanować spotkanie?</span>
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                  🤖
                </div>
                <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zapytaj o zadania, priorytety, wzorce..."
                className="flex-1 resize-none px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[52px] max-h-32"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  inputValue.trim() && !isLoading
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <PaperPlaneRight size={20} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-r from-purple-600 to-pink-600'
            : 'bg-gradient-to-r from-cyan-600 to-blue-600'
        }`}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Message */}
      <div className="flex-1 max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-gray-500 mt-1 px-2">
          {message.timestamp.toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}
