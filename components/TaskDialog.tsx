'use client'

import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function TaskDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [task, setTask] = useState<{ id: string; title: string } | null>(null)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatKey = task ? `chat_todoist_${task.id}` : null

  // 📡 Otwieranie przez globalny event chatSelect
  useEffect(() => {
    const handleSelect = (event: CustomEvent) => {
      const detail = event.detail
      if (!detail?.task?.id) return
      setTask({ id: detail.task.id, title: detail.task.title })
      setIsOpen(true)
    }

    window.addEventListener('chatSelect', handleSelect as EventListener)
    return () => {
      window.removeEventListener('chatSelect', handleSelect as EventListener)
    }
  }, [])

  // 📦 Wczytaj historię rozmowy
  useEffect(() => {
    if (!chatKey) return
    const saved = localStorage.getItem(chatKey)
    if (saved) {
      setChat(JSON.parse(saved))
    } else {
      setChat([])
    }
  }, [chatKey])

  // 💾 Zapisuj czat
  useEffect(() => {
    if (chatKey) {
      localStorage.setItem(chatKey, JSON.stringify(chat))
    }
  }, [chat, chatKey])

  // 💬 Wysyłanie wiadomości
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !task) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const updated = [...chat, userMsg]
    setChat(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      const reply =
        data.reply || data.content || '🤖 Brak odpowiedzi od AI.'

      const aiMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
      setChat((prev) => [...prev, aiMsg])
    } catch (err) {
      console.error('Błąd AI:', err)
      setChat((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Błąd komunikacji z AI.', timestamp: Date.now() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => setTask(null), 300)
  }

  // 🔽 Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat])

  if (!isOpen || !task) return null

  // 🪄 Modal
  const modal = (
    <AnimatePresence>
      <motion.div
        key="modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="sticky top-0 flex justify-between items-center px-5 py-3 border-b bg-gray-50 z-10">
            <h2 className="text-lg font-semibold text-gray-800 truncate pr-4">
              {task.title}
            </h2>
            <button
              onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              ✕ Zamknij
            </button>
          </div>

          {/* CZAT */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto flex flex-col gap-3 px-5 py-4 bg-gray-50 scroll-smooth"
          >
            {chat.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm shadow-sm max-w-[85%] ${
                  msg.role === 'user'
                    ? 'self-end bg-blue-600 text-white'
                    : 'self-start bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm max-w-none"
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            ))}
            {loading && <p className="text-sm text-gray-500 italic">AI myśli...</p>}
          </div>

          {/* INPUT */}
          <div className="sticky bottom-0 border-t bg-white flex p-3 space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Napisz wiadomość..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              Wyślij
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return typeof window !== 'undefined' ? ReactDOM.createPortal(modal, document.body) : null
}
