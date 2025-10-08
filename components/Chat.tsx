'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage } from '@/lib/types'

interface ChatProps {
  onSend: (msg: string) => Promise<void>
  messages: ChatMessage[]
}

export default function Chat({ onSend, messages }: ChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const msg = input.trim()
    setInput('')
    await onSend(msg)
  }

  return (
    <div className="flex flex-col h-[70vh] card overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3 rounded-xl max-w-[80%] ${
                m.role === 'user'
                  ? 'ml-auto bg-blue-500 text-white'
                  : 'bg-neutral-100 border border-neutral-200'
              }`}
            >
              {m.content}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Napisz wiadomość..."
          className="input flex-1"
        />
        <button className="btn btn-primary" onClick={handleSend}>
          Wyślij
        </button>
      </div>
    </div>
  )
}
