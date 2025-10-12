'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import remarkGfm from 'remark-gfm'

type TodoistTask = {
  id: string
  content: string
  due?: { date: string } | null
  priority?: number
  completed?: boolean
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function TodoistAIView({ token }: { token: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [tasks, setTasks] = useState<TodoistTask[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
  const [activeFilter, setActiveFilter] = useState<'today' | '7days' | '30days' | 'overdue'>('today')
  const bottomRef = useRef<HTMLDivElement>(null)

  // 🧭 Scroll do dołu po nowej wiadomości
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 📂 Wczytanie historii po kliknięciu w sidebar
  useEffect(() => {
    const handleChatSelect = (event: any) => {
      if (event.detail?.mode === 'todoist' && event.detail?.task?.id) {
        const { id, title } = event.detail.task
        const saved = localStorage.getItem(`chat_todoist_${id}`)
        if (saved) {
          setMessages(JSON.parse(saved))
          setSessionId(id)
          console.log(`📂 Wczytano historię Todoist: ${title}`)
        }
      }
    }
    window.addEventListener('chatSelect', handleChatSelect)
    return () => window.removeEventListener('chatSelect', handleChatSelect)
  }, [])

  // 🧾 Utwórz nową sesję
  const startNewChat = (title: string) => {
    const newId = crypto.randomUUID()
    setSessionId(newId)
    setMessages([])
    setTasks([])

    const sessions = JSON.parse(localStorage.getItem('chat_sessions_todoist') || '[]')
    const newEntry = { id: newId, title, timestamp: Date.now() }
    localStorage.setItem('chat_sessions_todoist', JSON.stringify([newEntry, ...sessions]))
    window.dispatchEvent(new Event('chatUpdated'))
    return newId
  }

  // 📡 Pobierz zadania z Todoist
  const fetchTasks = async (filter: 'today' | '7days' | '30days' | 'overdue') => {
    if (!token) return
    setActiveFilter(filter)

    const titles = {
      today: 'Zadania na dziś',
      '7days': 'Zadania na tydzień',
      '30days': 'Zadania na miesiąc',
      overdue: 'Zadania przeterminowane',
    }

    const newId = startNewChat(titles[filter])
    setLoading(true)

    try {
      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const all = await res.json()
      const now = new Date()

      const filtered = all.filter((t: any) => {
        if (!t.due?.date) return false
        const due = new Date(t.due.date)
        const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (filter === 'today') return diff >= -0.5 && diff < 1.5
        if (filter === '7days') return diff >= -0.5 && diff < 7
        if (filter === '30days') return diff >= -0.5 && diff < 30
        if (filter === 'overdue') return diff < -0.5
        return true
      })

      setTasks(filtered)
      const infoMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `📋 Załadowano ${filtered.length} zadań (${titles[filter]}).`,
        timestamp: Date.now(),
      }
      setMessages([infoMsg])
      localStorage.setItem(`chat_todoist_${newId}`, JSON.stringify([infoMsg]))
    } catch (err) {
      console.error('❌ Błąd Todoist:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchTasks('today')
  }, [token])

  // 💬 Wysyłanie wiadomości
  const handleSend = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    const updated = [...messages, userMsg]
    setMessages(updated)
    localStorage.setItem(`chat_todoist_${sessionId}`, JSON.stringify(updated))
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tasks }),
      })
      const data = await res.json()
      const reply = data.reply || data.content || '🤖 Brak odpowiedzi od AI.'
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply.trim(),
        timestamp: Date.now(),
      }
      const final = [...updated, aiMsg]
      setMessages(final)
      localStorage.setItem(`chat_todoist_${sessionId}`, JSON.stringify(final))
    } catch (err) {
      console.error('❌ Błąd AI:', err)
    } finally {
      setLoading(false)
    }
  }

  // 🧠 Grupowanie zadań
  const handleGroupTasks = async () => {
    if (!tasks.length) {
      await handleSend('Nie mam żadnych zadań do pogrupowania.')
      return
    }

    const now = new Date()
    let context = ''
    if (activeFilter === 'today') {
      context = `na dziś (${now.toLocaleDateString('pl-PL')})`
    } else if (activeFilter === '7days') {
      const end = new Date(now)
      end.setDate(now.getDate() + 7)
      context = `na okres od ${now.toLocaleDateString('pl-PL')} do ${end.toLocaleDateString('pl-PL')}`
    } else if (activeFilter === '30days') {
      const end = new Date(now)
      end.setDate(now.getDate() + 30)
      context = `na okres od ${now.toLocaleDateString('pl-PL')} do ${end.toLocaleDateString('pl-PL')}`
    } else if (activeFilter === 'overdue') {
      context = 'które są przeterminowane'
    }

    await handleSend(`Pogrupuj te zadania tematycznie ${context}.`)
  }

  // 🧹 Wyczyść czat
  const handleClear = () => {
    if (confirm('Czy na pewno chcesz wyczyścić czat?')) {
      setMessages([])
      localStorage.removeItem(`chat_todoist_${sessionId}`)
    }
  }

  return (
    <div className="flex flex-col h-[85vh] max-h-[85vh] p-3 space-y-3 overflow-hidden">
      {/* 🔘 Status */}
      <div className="text-sm font-medium text-green-600 mb-1">
        🟢 Połączono z Todoist
      </div>

      {/* 🔘 Górne przyciski */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'today', label: '📅 Dziś' },
            { key: '7days', label: '🗓️ Tydzień' },
            { key: '30days', label: '📆 Miesiąc' },
            { key: 'overdue', label: '⏰ Przetermin.' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => fetchTasks(f.key as any)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                activeFilter === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => startNewChat('Nowy czat')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ➕ Nowy czat
          </button>
          <button
            onClick={handleClear}
            className="text-sm text-red-600 hover:text-red-800"
          >
            🗑️ Wyczyść
          </button>
        </div>
      </div>

      {/* 🧩 Lista zadań */}
      <div className="max-h-[35vh] overflow-y-auto border rounded-lg p-2 bg-gray-50 shadow-inner">
        {tasks.length === 0 ? (
          <div className="text-gray-500 text-sm italic text-center py-4">
            Brak zadań do wyświetlenia
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-xl border ${
                  t.completed
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-200'
                } shadow-sm hover:shadow-md transition relative`}
              >
                <p
                  className={`text-sm font-medium ${
                    t.completed ? 'line-through text-gray-400' : 'text-gray-800'
                  }`}
                >
                  {t.content}
                </p>
                <div className="text-xs text-gray-500 mt-1 flex gap-2">
                  {t.due?.date && (
                    <span>📅 {new Date(t.due.date).toLocaleDateString('pl-PL')}</span>
                  )}
                  {t.priority && <span>⭐ P{t.priority}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 💬 Czat */}
      <div className="flex-1 overflow-y-auto bg-white border rounded-xl p-3 shadow-sm">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm max-w-none"
              >
                {m.content}
              </ReactMarkdown>
            </div>
          </motion.div>
        ))}
        {loading && <div className="text-center text-gray-500 text-sm">⏳ AI myśli...</div>}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          placeholder="Napisz np. „Pogrupuj zadania”"
          onKeyDown={(e) =>
            e.key === 'Enter' && !loading && handleSend(e.currentTarget.value)
          }
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            const input = document.querySelector('input')
            if (input && input.value.trim()) {
              handleSend(input.value)
              input.value = ''
            }
          }}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          Wyślij
        </button>
      </div>

      {tasks.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleGroupTasks}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            🧠 Pogrupuj tematycznie
          </button>
        </div>
      )}
    </div>
  )
}
