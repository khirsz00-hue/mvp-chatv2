'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PaperPlaneRight,
  Robot,
  User,
  Lightning,
  Calendar,
  ListChecks,
  Fire,
  Check
} from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  recommendations?: ChatRecommendation[]
}

interface ChatRecommendation {
  id: string
  type: 'GROUP_TASKS' | 'MOVE_TASK' | 'SIMPLIFY' | 'SCHEDULE_SLOT' | 'ENERGY_CHANGE'
  title: string
  reason: string
  taskDetails?: Array<{
    taskId: string
    title: string
  }>
  actions: Array<{
    op: string
    [key: string]: any
  }>
}

interface DayChatProps {
  userId: string
  onActionApply?: (recommendation: ChatRecommendation) => void
}

export function DayChat({ userId, onActionApply }: DayChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history for today
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/day-assistant/chat?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
      }
    }

    if (userId) {
      loadChatHistory()
    }
  }, [userId])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/day-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message: currentInput,
          conversationHistory: messages
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.summary || data.message,
          timestamp: new Date().toISOString(),
          recommendations: data.recommendations
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickCommand = (command: string) => {
    setInput(command)
  }

  const handleApplyRecommendation = (recommendation: ChatRecommendation) => {
    if (onActionApply) {
      onActionApply(recommendation)
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Robot size={24} className="text-brand-purple" />
          Asystent Dnia - Czat
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Sterowanie dniem przez rozmowę
        </p>
      </div>

      {/* Quick Commands */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickCommand('co teraz?')}
            className="text-xs"
          >
            <Lightning size={14} className="mr-1" />
            Co teraz?
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickCommand('jest mi ciężko')}
            className="text-xs"
          >
            <Fire size={14} className="mr-1" />
            Jest mi ciężko
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickCommand('mam flow')}
            className="text-xs"
          >
            <Check size={14} className="mr-1" />
            Mam flow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickCommand('znajdź czas na spotkanie 30 min')}
            className="text-xs"
          >
            <Calendar size={14} className="mr-1" />
            Znajdź czas
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-brand-purple'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User size={18} className="text-white" />
                ) : (
                  <Robot size={18} className="text-white" />
                )}
              </div>

              <div
                className={`flex-1 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block px-4 py-2 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-brand-purple text-white'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Recommendations */}
                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="glass p-3 rounded-xl border border-brand-purple/20"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{rec.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rec.reason}
                            </p>
                            {/* Show task details if available */}
                            {rec.taskDetails && rec.taskDetails.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-semibold text-brand-purple">
                                  Zadania:
                                </p>
                                <ul className="text-xs space-y-0.5 ml-2">
                                  {rec.taskDetails.map((task, idx) => (
                                    <li key={task.taskId} className="flex items-start gap-1">
                                      <span className="text-muted-foreground">•</span>
                                      <span>{task.title}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleApplyRecommendation(rec)}
                            className="flex-shrink-0"
                          >
                            Zastosuj
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Robot size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="inline-block px-4 py-2 rounded-2xl bg-muted">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Napisz komendę lub pytanie..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0"
          >
            <PaperPlaneRight size={20} />
          </Button>
        </div>
      </div>
    </Card>
  )
}
