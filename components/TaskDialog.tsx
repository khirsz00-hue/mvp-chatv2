'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [task, setTask] = useState<{ id: string; title: string }>({ id: '', title: '' })
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const recentMessages = useRef<Set<string>>(new Set())
  const [token, setToken] = useState<string>('')

  const chatKey = task?.id ? `chat_todoist_${task.id}` : ''

  // 🔹 Otwieranie dialogu przez event
  useEffect(() => {
    const openChat = (event: any) => {
      if (event.detail?.mode === 'todoist' && event.detail?.task) {
        const t = event.detail.task
        setTask({ id: t.id, title: t.title || t.content })
        const saved = localStorage.getItem(`chat_todoist_${t.id}`)
        setChat(saved ? JSON.parse(saved) : [])
        setIsOpen(true)
        console.log(`🗨️ Otwieram czat dla ${t.title}`)
      }
    }
    window.addEventListener('chatSelect', openChat)
    return () => window.removeEventListener('chatSelect', openChat)
  }, [])

  // 📦 Token
  useEffect(() => {
    const tk = localStorage.getItem('todoist_token') || ''
    setToken(tk)
  }, [])

  // 💾 Autozapis
  useEffect(() => {
    if (chatKey && chat.length > 0)
      localStorage.setItem(chatKey, JSON.stringify(chat))
  }, [chat, chatKey])

  // 🔽 Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [chat])

  // ✉️ Wysyłanie wiadomości
  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setLoading(true)

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setChat((prev) => [userMsg, ...prev])
    recentMessages.current.add(`user:${text}`)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, token }),
      })
      const data = await res.json()
      const reply =
        data.reply?.trim() ||
        data.content?.trim() ||
        data.message?.trim() ||
        '🤖 Brak odpowiedzi od AI.'

      const aiMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
      setChat((prev) => [aiMsg, userMsg, ...prev])
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setChat((prev) => [
        { role: 'assistant', content: '⚠️ Błąd komunikacji z AI.', timestamp: Date.now() },
        ...prev,
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // 🪄 Modal
  const modal = (
    <AnimatePresence>
      <motion.div
        key="dialog"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3"
        onClick={() => setIsOpen(false)}
      >
        <div
          className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="sticky top-0 flex justify-between items-center px-5 py-3 border-b bg-gray-50 z-10">
            <h2 className="text-lg font-semibold text-gray-800 truncate pr-4">
              {task.title || 'Rozmowa z AI'}
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              ✕ Zamknij
            </button>
          </div>

          {/* CZAT */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto flex flex-col-reverse px-5 py-4 space-y-4 bg-gray-50 scroll-smooth"
          >
            {chat.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg shadow-sm text-sm leading-relaxed transition-all duration-200 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white self-end markdown-user'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className={`prose prose-sm max-w-none ${
                    msg.role === 'user'
                      ? 'text-white prose-headings:text-white prose-strong:text-white prose-a:text-white [&_*]:!text-white'
                      : 'text-gray-800 prose-a:text-blue-600'
                  }`}
                >
                  {msg.content}
                </ReactMarkdown>
                <div className="text-[10px] mt-1 opacity-70 text-right">
                  {new Date(msg.timestamp).toLocaleString([], {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}

            {chat.length === 0 && (
              <div className="bg-white p-3 rounded-lg shadow-sm border text-sm text-gray-800 leading-relaxed">
                🧠 Rozpocznij rozmowę z AI o zadaniu: <b>"{task.title}"</b>.
              </div>
            )}

            {loading && <div className="text-sm text-gray-500 animate-pulse">AI myśli...</div>}
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
        </div>
      </motion.div>
    </AnimatePresence>
  )

  return typeof window !== 'undefined'
    ? ReactDOM.createPortal(modal, document.body)
    : null
}
