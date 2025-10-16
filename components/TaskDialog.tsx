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

interface TaskDialogProps {
  task?: { id: string; title: string }
  mode?: 'help' | 'task' | 'todoist'
  onClose?: () => void
}

export default function TaskDialog({ task: initialTask, mode = 'help', onClose }: TaskDialogProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [modeState, setModeState] = useState<'help' | 'task' | 'todoist'>(mode)
  const [task, setTask] = useState<{ id: string; title: string } | null>(initialTask || null)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 🔑 Klucz czatu
  const chatKey = task
    ? modeState === 'task'
      ? `chat_task_${task.id}`
      : `chat_todoist_${task.id}`
    : null

  // 📡 Otwieranie przez globalny event
  useEffect(() => {
    const handleSelect = (event: CustomEvent) => {
      const detail = event.detail
      if (detail?.task?.id) {
        setTask({ id: detail.task.id, title: detail.task.title })
        setModeState(detail.mode || 'todoist')
        setIsOpen(true)
      }
    }
    window.addEventListener('chatSelect', handleSelect as EventListener)
    return () => window.removeEventListener('chatSelect', handleSelect as EventListener)
  }, [])

  // 📦 Wczytaj historię rozmowy
  useEffect(() => {
    if (!chatKey) return
    try {
      const saved = localStorage.getItem(chatKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setChat(Array.isArray(parsed) ? parsed : [])
      } else setChat([])
    } catch (err) {
      console.error('Błąd odczytu historii:', err)
      setChat([])
    }
  }, [chatKey])

  // 💾 Zapisuj czat
  useEffect(() => {
    if (chatKey) localStorage.setItem(chatKey, JSON.stringify(chat))
  }, [chat, chatKey])

  // ✉️ Wysyłanie wiadomości
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !task) return
    setInput('')
    setLoading(true)

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setChat((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: modeState,
          taskId: task.id,
        }),
      })

      const data = await res.json()
      const reply =
        data.reply ||
        data.content ||
        data.message ||
        '🤖 Nie otrzymano odpowiedzi od AI. Spróbuj ponownie.'

      const aiMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }

      // 💾 Zapisz odpowiedź i skrót
      setChat((prev) => {
        const updated = [...prev, aiMsg]
        if (chatKey) localStorage.setItem(chatKey, JSON.stringify(updated))
        localStorage.setItem(`summary_${task.id}`, aiMsg.content.slice(0, 300))
        return updated
      })

      // 🧠 Zapisz do historii
      localStorage.setItem(`task_title_${task.id}`, task.title)
      const sessions = JSON.parse(localStorage.getItem('chat_sessions_task') || '[]')
      const existing = sessions.find((s: any) => s.id === task.id)
      const newEntry = {
        id: task.id,
        title: task.title,
        timestamp: Date.now(),
        last: reply.slice(0, 200),
      }

      if (existing) {
        existing.last = newEntry.last
        existing.timestamp = newEntry.timestamp
      } else {
        sessions.unshift(newEntry)
      }

      localStorage.setItem('chat_sessions_task', JSON.stringify(sessions))
      window.dispatchEvent(new Event('chatUpdated'))
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setChat((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Wystąpił błąd komunikacji z AI.', timestamp: Date.now() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      setTask(null)
      onClose?.()
    }, 200)
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
              <span className="ml-2 text-xs text-gray-500">
                ({modeState === 'task' ? 'Zadanie' : 'Todoist'})
              </span>
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
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
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
