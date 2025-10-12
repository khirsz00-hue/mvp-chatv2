'use client'

import { useState, useEffect } from 'react'
import Chat, { ChatMessage } from './Chat'
import ReactMarkdown from 'react-markdown'

type TodoistTask = {
  id: string
  content: string
  due?: { date: string } | null
  priority?: number
  completed?: boolean
}

export default function TodoistAIView() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TodoistTask[]>([])
  const [loading, setLoading] = useState(false)

  // 🔹 Pobierz token z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('todoist_token')
    if (saved) setToken(saved)
  }, [])

  // 🔹 Pobierz zadania z Todoista z filtrami
  const fetchTasks = async (filter: string = 'today') => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Todoist API error: ${res.status}`)
      const all = await res.json()

      // 🧠 Logika filtrowania
      const now = new Date()
      const filtered = all.filter((t: any) => {
        if (!t.due?.date) return false
        const due = new Date(t.due.date)
        const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (filter === 'today') return diff >= 0 && diff < 1
        if (filter === '7days') return diff >= 0 && diff < 7
        if (filter === '30days') return diff >= 0 && diff < 30
        if (filter === 'overdue') return diff < 0
        return true
      })

      setTasks(filtered)
      console.log(`✅ Załadowano ${filtered.length} zadań (${filter})`)

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `📋 Załadowano ${filtered.length} zadań (${filter}).`,
          timestamp: Date.now(),
        },
      ])
    } catch (err) {
      console.error('❌ Błąd Todoist:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Nie udało się pobrać zadań z Todoista.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // ✅ Oznacz jako ukończone
  const toggleTask = async (taskId: string) => {
    if (!token) return
    try {
      await fetch(`https://api.todoist.com/rest/v2/tasks/${taskId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        )
      )
    } catch (err) {
      console.error('❌ Nie udało się oznaczyć zadania jako ukończone:', err)
    }
  }

  // 💬 Wyślij wiadomość do AI
  const handleSend = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, token, tasks }),
      })

      const data = await res.json()
      console.log('📩 Surowa odpowiedź backendu:', data)

      let reply =
        data.content ||
        data.reply ||
        data.message ||
        (typeof data === 'string' ? data : '') ||
        '🤖 Brak odpowiedzi od AI.'

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply.trim(),
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Wystąpił błąd podczas komunikacji z AI.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // 🧹 Wyczyść historię
  const handleClearHistory = () => {
    if (confirm('Na pewno chcesz usunąć historię rozmowy?')) {
      setMessages([])
      localStorage.removeItem('chat_todoist')
      setTasks([])
    }
  }

  // ✨ Nowy czat
  const handleNewChat = () => {
    setMessages([])
    setTasks([])
    localStorage.removeItem('chat_todoist')
  }

  // 🧠 Pogrupuj tematycznie
  const handleGroupTasks = async () => {
    if (!tasks.length) {
      await handleSend('Nie mam żadnych zadań, które można pogrupować.')
      return
    }
    await handleSend(`Pogrupuj te zadania tematycznie:`)
  }

  // 🧩 Render task cards
  const renderTasks = () =>
    tasks.length === 0 ? (
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
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={!!t.completed}
                onChange={() => toggleTask(t.id)}
                className="mt-1 accent-green-600 cursor-pointer"
              />
              <div>
                <p
                  className={`text-sm font-medium ${
                    t.completed ? 'line-through text-gray-400' : 'text-gray-800'
                  }`}
                >
                  {t.content}
                </p>
                <div className="text-xs text-gray-500 mt-1 flex gap-2">
                  {t.due?.date && (
                    <span>
                      📅 {new Date(t.due.date).toLocaleDateString('pl-PL')}
                    </span>
                  )}
                  {t.priority && <span>⭐ P{t.priority}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )

  return (
    <div className="flex flex-col h-[85vh] max-h-[85vh] p-3 space-y-3 overflow-hidden">
      {/* 🔘 Status połączenia */}
      <div
        className={`text-sm font-medium mb-2 ${
          token ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {token ? '🟢 Połączono z Todoist' : '🔴 Brak połączenia z Todoist'}
      </div>

      {/* 🔘 Górne przyciski */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchTasks('today')}
            className="px-3 py-1.5 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200 transition"
          >
            📅 Dziś
          </button>
          <button
            onClick={() => fetchTasks('7days')}
            className="px-3 py-1.5 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200 transition"
          >
            🗓️ Ten tydzień
          </button>
          <button
            onClick={() => fetchTasks('30days')}
            className="px-3 py-1.5 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200 transition"
          >
            📆 Ten miesiąc
          </button>
          <button
            onClick={() => fetchTasks('overdue')}
            className="px-3 py-1.5 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200 transition"
          >
            ⏰ Przeterminowane
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewChat}
            className="text-sm text-blue-600 hover:text-blue-800 transition"
          >
            ✨ Nowy czat
          </button>
          <button
            onClick={handleClearHistory}
            className="text-sm text-red-600 hover:text-red-800 transition"
          >
            🗑️ Wyczyść historię
          </button>
        </div>
      </div>

      {/* 🧩 Task Cards */}
      <div className="max-h-[35vh] overflow-y-auto border rounded-lg p-2 bg-gray-50 shadow-inner">
        {renderTasks()}
      </div>

      {/* 💬 Chat */}
      <div className="flex-1 overflow-hidden">
        <Chat
          onSend={handleSend}
          messages={messages}
          assistant="todoist"
          hideHistory={false}
        />
      </div>

      {/* 🔘 Dół – Pogrupuj */}
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
