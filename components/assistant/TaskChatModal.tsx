'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChatCircle, 
  PaperPlaneRight,
  Robot,
  User,
  X
} from '@phosphor-icons/react'

interface Task {
  id: string
  content: string
  description?: string
  project_id?: string
  priority: 1 | 2 | 3 | 4
  due?: { date: string } | string
}

interface TaskChatModalProps {
  open: boolean
  onClose: () => void
  task: Task
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function TaskChatModal({
  open,
  onClose,
  task
}: TaskChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Initialize chat with welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      const welcomeMsg: Message = {
        role: 'assistant',
        content: `Cześć! 👋 Rozmawiajmy o zadaniu: **${task.content}**\n\n${task.description ? `${task.description}\n\n` : ''}O czym chcesz porozmawiać? Mogę pomóc Ci:\n- Doprecyzować szczegóły\n- Zaplanować kroki\n- Znaleźć rozwiązania problemów\n- Odpowiedzieć na pytania`,
        timestamp: new Date().toISOString()
      }
      setMessages([welcomeMsg])
    }
    
    if (!open) {
      // Reset when closed
      setMessages([])
      setChatInput('')
    }
  }, [open, task, messages.length])
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoadingChat) return
    
    const userMsg: Message = {
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMsg])
    const currentInput = chatInput
    setChatInput('')
    setIsLoadingChat(true)
    
    try {
      const response = await fetch('/api/chat/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          task: `${task.content}${task.description ? `\n\n${task.description}` : ''}`
        })
      })
      
      if (!response.ok) throw new Error('Failed to send message')
      
      const data = await response.json()
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply || 'Przepraszam, nie mogłem przetworzyć tej wiadomości.',
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      console.error('Error in chat:', err)
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoadingChat(false)
    }
  }
  
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-[60] w-full max-w-3xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <ChatCircle size={20} className="text-white" weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Czat o zadaniu</h3>
                    <p className="text-xs text-gray-600 truncate max-w-md">{task.content}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 w-8 h-8 rounded-lg hover:bg-gray-200 transition flex items-center justify-center"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                      <Robot size={16} className="text-white" weight="duotone" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-xl ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content.split('**').map((part, i) => 
                          i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <User size={16} className="text-white" weight="duotone" />
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isLoadingChat && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Robot size={16} className="text-white" />
                  </div>
                  <div className="bg-gray-100 p-3 rounded-xl">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-blue-600"
                          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <div className="px-6 py-4 border-t bg-gray-50 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Napisz wiadomość..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isLoadingChat}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoadingChat || !chatInput.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 flex items-center justify-center"
                >
                  <PaperPlaneRight size={18} weight="fill" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
