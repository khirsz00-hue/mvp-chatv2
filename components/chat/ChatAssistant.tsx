'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatCircle, X, Minus, PaperPlaneRight, CircleNotch, Sparkle, Calendar } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { TaskCard } from './TaskCard'

interface TaskData {
  id: string
  title: string
  description?: string
  priority: number
  estimate_min: number
  due_date?: string
  cognitive_load?: number
  context_type?: string
  postpone_count?: number
}

interface StructuredResponse {
  type: 'tasks' | 'meeting_slots' | 'text'
  text: string
  tasks?: TaskData[]
  slots?: Array<{ time: string; duration: number; energyLevel?: number }>
  footer?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  structured?: StructuredResponse
}

interface ChatAssistantProps {
  open: boolean
  onClose: () => void
}

// Meeting slot card component
function MeetingSlotCard({ slot }: { slot: { time: string; duration: number; energyLevel?: number } }) {
  return (
    <div className="bg-white border-2 border-cyan-200 rounded-xl p-3 hover:shadow-lg transition-shadow cursor-pointer mt-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900 text-sm">{slot.time}</div>
          <div className="text-xs text-gray-600 mt-1">
            {slot.duration} min
            {slot.energyLevel && (
              <span className="ml-2">• Energia: {slot.energyLevel}/10</span>
            )}
          </div>
        </div>
        <Calendar size={20} className="text-cyan-600" weight="bold" />
      </div>
    </div>
  )
}

export function ChatAssistant({ open, onClose }: ChatAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [lastMessageTime, setLastMessageTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Rate limiting: min 2s between messages
    const now = Date.now()
    if (now - lastMessageTime < 2000) {
      toast.error('Poczekaj chwilę przed następnym pytaniem')
      return
    }
    setLastMessageTime(now)
    setIsLoading(true)

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input.trim()
    setInput('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Musisz być zalogowany')
        return
      }

      // Call API to check if we get structured response
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: currentInput,
          conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      // Check if it's a structured JSON response or a stream
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        // Structured response
        const data: StructuredResponse = await response.json()
        
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.text,
          timestamp: new Date(),
          structured: data
        }
        
        setMessages(prev => [...prev, aiMessage])
      } else {
        // Stream response
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, aiMessage])

        // Read the stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
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
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessage.id 
                        ? { ...msg, content: msg.content + parsed.text }
                        : msg
                    ))
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Błąd podczas wysyłania wiadomości')
    } finally {
      setIsLoading(false)
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
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
        style={{ paddingBottom: '20px' }}>
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-10">
            <Sparkle size={32} className="mx-auto mb-2 text-gray-400" />
            <p>Zapytaj o zadania, priorytety,<br/>dziennik lub wzorce zachowań</p>
            <div className="mt-6 space-y-2">
              {[
                'Co mam na dziś?',
                'Jakie mam przeterminowane?',
                'Kiedy najlepszy czas na spotkanie?',
                'Nie mogę się skupić'
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
            
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'flex-1'}`}>
              <div className={`px-4 py-2 rounded-2xl text-sm
                             ${msg.role === 'user' 
                               ? 'rounded-tr-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                               : 'rounded-tl-sm bg-white text-gray-900 shadow-sm border border-gray-100'
                             }`}>
                {msg.content}
              </div>
              
              {/* Render structured content (tasks or slots) */}
              {msg.role === 'assistant' && msg.structured && (
                <div className="mt-2">
                  {msg.structured.type === 'tasks' && msg.structured.tasks && (
                    <div className="space-y-2">
                      {(() => {
                        // Calculate overdue status once for all tasks
                        const today = new Date()
                        return msg.structured.tasks!.map(task => {
                          // Check if task is overdue
                          const isOverdue = task.due_date ? new Date(task.due_date) < today : false
                          const priorityLabel = task.priority === 1 ? 'P1' 
                            : task.priority === 2 ? 'P2' 
                            : task.priority === 3 ? 'P3' 
                            : 'P4'
                          
                          return (
                            <TaskCard 
                              key={task.id} 
                              id={task.id}
                              title={task.title}
                              description={task.description}
                              estimate={`${task.estimate_min}min`}
                              priority={priorityLabel}
                              cognitive_load={task.cognitive_load}
                              due_date={task.due_date}
                              overdue={isOverdue}
                              context_type={task.context_type}
                              postpone_count={task.postpone_count}
                            />
                          )
                        })
                      })()}
                    </div>
                  )}
                  
                  {msg.structured.type === 'meeting_slots' && msg.structured.slots && (
                    <div className="space-y-2">
                      {msg.structured.slots.map((slot, idx) => (
                        <MeetingSlotCard key={idx} slot={slot} />
                      ))}
                    </div>
                  )}
                  
                  {msg.structured.footer && (
                    <div className="mt-2 px-4 py-2 rounded-xl text-sm bg-white text-gray-700 border border-gray-100">
                      {msg.structured.footer}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing indicator - removed as we don't use streaming anymore for structured */}
        
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
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-full border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-cyan-500
                       text-sm disabled:bg-gray-100"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600
                       text-white flex items-center justify-center
                       hover:scale-110 transition disabled:opacity-50 disabled:scale-100">
            {isLoading ? (
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

