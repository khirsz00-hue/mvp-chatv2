'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatCircle, X, Minus, PaperPlaneRight, CircleNotch, Sparkle } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useChatStream } from '@/hooks/useChatStream'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatAssistantProps {
  open: boolean
  onClose: () => void
}

export function ChatAssistant({ open, onClose }: ChatAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const { streamMessage, isStreaming } = useChatStream()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Musisz być zalogowany')
        return
      }

      // Create AI message placeholder
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])

      // Stream response
      await streamMessage(
        input.trim(),
        messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        session.access_token,
        (chunk) => {
          // Update AI message content in real-time
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: msg.content + chunk }
              : msg
          ))
        }
      )

    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Błąd podczas wysyłania wiadomości')
    }
  }

  if (!open) return null

  // Minimized state
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-6 z-50
                   w-14 h-14 rounded-full
                   bg-gradient-to-r from-cyan-600 to-blue-600
                   text-white shadow-xl
                   flex items-center justify-center
                   hover:scale-110 transition-all"
        title="Otwórz czat">
        <ChatCircle size={28} weight="fill" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 top-0 z-50
                    md:bottom-24 md:right-6 md:left-auto md:top-auto
                    md:w-[400px] md:h-[600px]
                    bg-white md:rounded-2xl shadow-2xl
                    border border-gray-200
                    flex flex-col
                    animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header */}
      <div className="px-4 py-3 
                      bg-gradient-to-r from-cyan-600 to-blue-600
                      text-white md:rounded-t-2xl
                      flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkle size={20} weight="fill" />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsMinimized(true)}
            className="w-8 h-8 rounded-full hover:bg-white/20 transition
                       flex items-center justify-center"
            title="Minimalizuj">
            <Minus size={20} weight="bold" />
          </button>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/20 transition
                       flex items-center justify-center"
            title="Zamknij">
            <X size={20} weight="bold" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-10">
            <Sparkle size={32} className="mx-auto mb-2 text-gray-400" />
            <p>Zapytaj o zadania, priorytety,<br/>dziennik lub wzorce zachowań</p>
            <div className="mt-6 space-y-2">
              {[
                'Jakie mam zadania na dziś?',
                'Kiedy jestem najbardziej produktywny?',
                'Jak spałem ostatnio?',
                'Które zadania odkładam?'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="block w-full px-4 py-2 text-sm text-left
                             bg-white border border-gray-200 rounded-lg
                             hover:border-cyan-500 hover:bg-cyan-50 transition">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600
                              flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkle size={16} weight="fill" className="text-white" />
              </div>
            )}
            
            <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm
                           ${msg.role === 'user' 
                             ? 'rounded-tr-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                             : 'rounded-tl-sm bg-white text-gray-900 shadow-sm border border-gray-100'
                           }`}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-2 ml-10">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t bg-white md:rounded-b-2xl">
        <div className="flex gap-2 items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Zapytaj o zadania, priorytety..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2 rounded-full border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-cyan-500
                       text-sm disabled:bg-gray-100"
          />
          <button 
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600
                       text-white flex items-center justify-center
                       hover:scale-110 transition disabled:opacity-50 disabled:scale-100">
            {isStreaming ? (
              <CircleNotch size={20} weight="bold" className="animate-spin" />
            ) : (
              <PaperPlaneRight size={20} weight="fill" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

