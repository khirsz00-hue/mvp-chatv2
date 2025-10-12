'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
  const bottomRef = useRef<HTMLDivElement>(null)

  // 🔹 Auto-scroll do najnowszej wiadomości
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 🔹 Pobierz token z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('todoist_token')
    if (saved) setToken(saved)
  }, [])

  // 🔹 Wczytaj wcześniejszy czat po kliknięciu w sidebar
  useEffect(() => {
    const handleChatSelect = (event: any) => {
      if (event.detail?.mode === 'todoist' && event.detail?.task?.id) {
        const { id, content } = event.detail.task
        const saved = localStorage.getItem(`chat_todoist_${id}`)
        if (saved) {
          const loadedMessages = JSON.parse(saved)
          setMessages(loadedMessages)
          setSessionId(id)
          console.log(`📂 Wczytano historię czatu Todoist: ${content}`)
        } else {
          console.warn('⚠️ Brak zapisanej historii dla', id)
          setMessages([])
        }
      }
    }

    window.addEventListener('chatSelect', handleChatSelect)
    return () => window.removeEventListener('chatSelect', handleChatSelect)
  }, [])

  // 🔹 Pobierz zadania z Todoista
  const fetchTasks = async (filter: string = 'today') => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Todoist API error: ${res.status}`)
      const all = await res.json()

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)

      const filtered = all.filter((t: any) => {
        if (!t.due?.date) return false
        const due = new Date(t.due.date)
        const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

        if (filter === 'today') return due >= today && due < tomorrow
        if (filter === '7days') return diff >= 0 && diff < 7
        if (filter === '30days') return diff >= 0 && diff < 30
        if (filter === 'overdue') return due < today
        return true
      })

      setTasks(filtered)
      console.log(`✅ Załadowano ${filtered.length} zadań (${filter})`)

      const infoMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `📋 Załadowano ${filtered.length} zadań (${filter}).`,
        timestamp: Date.now(),
      }

      setMessages((prev) => {
        const updated = [...prev, infoMsg]
        localStorage.setItem(`chat_todoist_${sessionId}`, JSON.stringify(updated))
        return updated
      })
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

  // 💬 Wysyłanie wiadomości do AI
  const handleSend = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }

    setMessages((prev) => {
      const updated = [...prev, userMsg]
      localStorage.setItem(`chat_todoist_${sessionId}`, JSON.stringify(updated))
      return updated
    })

    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, token, tasks }),
      })

      const data = await res.json()
      console.log('📩 Odpowiedź backendu:', data)

      const reply =
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

      setMessages((prev) => {
        const updated = [...prev, aiMsg]
        localStorage.setItem(`chat_todoist_${sessionId}`, JSON.stringify(updated))
        return updated
      })
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
      setTasks([])
      localStorage.removeItem(`chat_todoist_${sessionId}`)
    }
  }

  // ✨ Nowy czat — dodaje sesję do historii
  const handleNewChat = () => {
    const newId = crypto.randomUUID()
    setSessionId(newId)
    setMessages([])
    setTasks([])

    const sessions = JSON.parse(localStorage.getItem('chat_sessions_todoist') || '[]')
    const newEntry = {
      id: newId,
      title: `Czat ${new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      timestamp: Date.now(),
    }

    localStorage.setItem('chat_sessions_todoist', JSON.stringify([newEntry, ...sessions]))
    window.dispatchEvent(new Event('chatUpdated'))
  }

  // 🧠 Pogrupuj zadania
  const handleGroupTasks = async () => {
    if (!tasks.length) {
      await handleSend('Nie mam żadnych zadań, które można pogrupować.')
      return
    }
    await handleSend('Pogrupuj te zadania tematycznie.')
  }

  // 🧩 Render listy zadań
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
            } shadow-sm hover:shadow-md transition`}
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
        className={`text-sm font-medium ${
          token ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {token ? '🟢 Połączono z Todoist' : '🔴 Brak połączenia z Todoist'}
      </div>

      {/* 🔘 Górne przyciski */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
        <div className="flex flex-wrap gap-2">
          {[
            { label: '📅 Dziś', key: 'today' },
            { label: '🗓️ Ten tydzień', key: '7days' },
            { label: '📆 Ten miesiąc', key: '30days' },
            { label: '⏰ Przeterminowane', key: 'overdue' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => fetchTasks(f.key)}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              {f.label}
            </button>
          ))}
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
      <div className="flex-1 overflow-y-auto bg-white border rounded-xl p-3 shadow-sm">
        {messages.map((m) => (
          <div key={m.id} className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <ReactMarkdown className="prose prose-sm max-w-none">{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend(e.currentTarget.value)}
          disabled={loading}
          placeholder="Napisz np. 'Daj taski na dziś' lub 'Pogrupuj zadania'"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('input')
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
