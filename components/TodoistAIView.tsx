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

  // 🔹 Pobierz zadania z Todoista (np. na dziś)
  useEffect(() => {
    if (!token) return

    const fetchTasks = async () => {
      try {
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setTasks(data || [])
      } catch (err) {
        console.error('❌ Błąd Todoist:', err)
      }
    }

    fetchTasks()
  }, [token])

  // ✅ Zmiana statusu zadania (toggle complete)
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

  // 💬 Wyślij wiadomość do AI z kontekstem Todoista
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

      const contextPrompt = `
Użytkownik ma następujące zadania w Todoist:
${contextTasks || '(Brak zadań)'}

Jego wiadomość: "${message}"

Zasady:
- Odpowiedz po polsku, jasno i praktycznie.
- Jeśli użytkownik prosi o pogrupowanie, zaproponuj logiczne kategorie i ich nazwy.
- Jeśli pyta o priorytety lub plan dnia, zaproponuj kolejność wykonania.
Nie powtarzaj listy zadań dosłownie, przedstaw przetworzoną analizę.
      `.trim()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: contextPrompt, token }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd API')

      // jeśli zwraca listę zadań
      if (data.type === 'tasks' && data.tasks?.length) {
        setMessages([
          ...updated,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            type: 'tasks',
            tasks: data.tasks,
            content: '📋 Twoje zadania:',
            timestamp: Date.now(),
          },
        ])
      } else {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content || data.reply || '🤖 Brak odpowiedzi od AI.',
          timestamp: Date.now(),
        }
        setMessages([...updated, aiMsg])
      }
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Błąd komunikacji z AI.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // 🧠 Pogrupuj tematycznie
  const handleGroupTasks = async () => {
    if (tasks.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '📭 Brak zadań do pogrupowania.',
          timestamp: Date.now(),
        },
      ])
      return
    }

    const groupPrompt = `
Oto lista zadań użytkownika:
${tasks.map((t) => `- ${t.content}`).join('\n')}

Pogrupuj je w sensowne tematy lub obszary życia.
Nadaj każdej grupie nazwę i krótki opis.
Nie powtarzaj dokładnych treści zadań — grupuj logicznie.
    `.trim()

    await handleSend(groupPrompt)
  }

  // 🧹 Wyczyść historię
  const handleClearHistory = () => {
    if (confirm('Na pewno chcesz usunąć historię rozmowy?')) {
      setMessages([])
      localStorage.removeItem('chat_todoist')
    }
  }

  // 🧩 Renderowanie Task Cards
  const renderTasks = () => {
    if (tasks.length === 0)
      return (
        <div className="text-gray-500 text-sm italic text-center py-4">
          Brak zadań do wyświetlenia
        </div>
      )

    return (
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
                  {t.priority && t.priority > 1 && (
                    <span>⭐ Priorytet: {t.priority}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      {/* 🔘 Przyciski akcji */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSend('Daj taski na dziś')}
            className="px-3 py-1.5 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200 transition"
          >
            📅 Taski na dziś
          </button>
          <button
            onClick={() => handleSend('Daj taski na ten tydzień')}
            className="px-3 py-1.5 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200 transition"
          >
            🗓️ Taski na tydzień
          </button>
          <button
            onClick={() => handleSend('Daj taski na ten miesiąc')}
            className="px-3 py-1.5 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200 transition"
          >
            📆 Taski na miesiąc
          </button>
          <button
            onClick={() => handleSend('Daj przeterminowane taski')}
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

      {/* 🔘 Dół — Pogrupuj tematycznie */}
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
