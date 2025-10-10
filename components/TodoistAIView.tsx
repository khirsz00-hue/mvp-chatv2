'use client'

import { useState, useEffect } from 'react'
import Chat, { ChatMessage } from './Chat'

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

  // 🔹 Pobierz zadania bezpośrednio z Todoista (z frontu)
  const fetchTasks = async (filter: string = 'today') => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Todoist API error: ${res.status}`)
      const all = await res.json()

      const now = new Date()
      const checkDate = (date?: string) => {
        if (!date) return false
        const d = new Date(date)
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (filter === 'today') return d.toDateString() === now.toDateString()
        if (filter === 'tomorrow') return diffDays >= 0.5 && diffDays < 1.5
        if (filter === '7days') return diffDays >= 0 && diffDays < 7
        if (filter === '30days') return diffDays >= 0 && diffDays < 30
        if (filter === 'overdue') return d < now
        return false
      }

      const filtered = all.filter((t: TodoistTask) =>
        t.due?.date ? checkDate(t.due.date) : false
      )

      setTasks(filtered)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `📋 Znaleziono ${filtered.length} zadań (${filter}).`,
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

  // ✅ Toggle complete
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

  // 💬 Wyślij prompt do AI
  const handleSend = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    try {
      const contextTasks = tasks
        .map(
          (t) =>
            `- ${t.content}${
              t.due?.date ? ` (termin: ${t.due.date})` : ''
            }${t.completed ? ' ✅' : ''}`
        )
        .join('\n')

      const prompt = `
Użytkownik ma następujące zadania:
${contextTasks || '(Brak zadań)'}

Wiadomość użytkownika: "${message}"
Odpowiedz po polsku, praktycznie i zwięźle.
      `.trim()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      })

      const data = await res.json()
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || data.content || '🤖 Brak odpowiedzi od AI.',
        timestamp: Date.now(),
      }
      setMessages([...updated, aiMsg])
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
    } finally {
      setLoading(false)
    }
  }

  // 🧹 Wyczyść historię
  const handleClearHistory = () => {
    if (confirm('Na pewno chcesz usunąć historię rozmowy?')) {
      setMessages([])
      localStorage.removeItem('chat_todoist')
    }
  }

  // 🧠 Pogrupuj tematycznie
  const handleGroupTasks = async () => {
    if (!tasks.length) {
      handleSend('Nie mam żadnych zadań, które można pogrupować.')
      return
    }

    const groupPrompt = `
Pogrupuj te zadania tematycznie:
${tasks.map((t) => `- ${t.content}`).join('\n')}
    `.trim()

    await handleSend(groupPrompt)
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
              t.completed ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
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
                    <span>📅 {new Date(t.due.date).toLocaleDateString('pl-PL')}</span>
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
    <div className="flex flex-col h-full p-3 space-y-3">
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
        <button
          onClick={handleClearHistory}
          className="text-sm text-red-600 hover:text-red-800 transition"
        >
          🗑️ Wyczyść historię
        </button>
      </div>

      {/* 🧩 Task Cards */}
      <div className="max-h-[40vh] overflow-y-auto">{renderTasks()}</div>

      {/* 💬 Chat */}
      <div className="flex-1">
        <Chat
          onSend={handleSend}
          messages={
            loading
              ? [
                  ...messages,
                  {
                    id: 'loader',
                    role: 'assistant',
                    content: '💭 AI analizuje zadania...',
                    timestamp: Date.now(),
                  },
                ]
              : messages
          }
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
