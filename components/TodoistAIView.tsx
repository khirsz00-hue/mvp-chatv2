'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import remarkGfm from 'remark-gfm'
import TaskCard from './TaskCard'

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
  timestamp: number
  // rozszerzenie na wiadomości z listą zadań
  type?: 'text' | 'tasks'
  content?: string
  tasks?: TodoistTask[]
}

export default function TodoistAIView({ token }: { token: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [tasks, setTasks] = useState<TodoistTask[]>([]) // ostatnio pobrane (do "Pogrupuj tematycznie")
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 🧭 Autoscroll po nowej wiadomości
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 📂 Wczytanie historii po kliknięciu w sidebar (chatSelect)
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

  // 🧾 Nowa sesja
  const startNewChat = (title: string) => {
    const newId = crypto.randomUUID()
    setSessionId(newId)
    setMessages([])

    const sessions = JSON.parse(localStorage.getItem('chat_sessions_todoist') || '[]')
    const newEntry = { id: newId, title, timestamp: Date.now() }
    localStorage.setItem('chat_sessions_todoist', JSON.stringify([newEntry, ...sessions]))
    window.dispatchEvent(new Event('chatUpdated'))
    return newId
  }

  // 🔎 Rozpoznanie prośby o listę zadań w wiadomości użytkownika
  const detectFilterFromMessage = (
    text: string
  ): null | { key: 'today' | '7days' | '30days' | 'overdue'; title: string } => {
    const t = text.toLowerCase()

    // dziś
    if (
      t.includes('dziś') || t.includes('dzis') || t.includes('dzisiaj') || t.includes('na dziś') || t.includes('na dzis')
    ) {
      return { key: 'today', title: 'Zadania na dziś' }
    }
    // tydzień
    if (t.includes('tydzień') || t.includes('tydzien') || t.includes('7 dni') || t.includes('na tydzień')) {
      return { key: '7days', title: 'Zadania na tydzień' }
    }
    // miesiąc
    if (t.includes('miesiąc') || t.includes('miesiac') || t.includes('30 dni') || t.includes('na miesiąc')) {
      return { key: '30days', title: 'Zadania na miesiąc' }
    }
    // przeterminowane
    if (t.includes('przetermin')) {
      return { key: 'overdue', title: 'Zadania przeterminowane' }
    }
    return null
  }

  // 📡 Pobierz zadania z Todoist wg filtra
  const fetchTasksByFilter = async (filter: 'today' | '7days' | '30days' | 'overdue') => {
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const all = await res.json()
    const now = new Date()

    const filtered: TodoistTask[] = all.filter((t: any) => {
      if (!t.due?.date) return false
      const due = new Date(t.due.date)
      const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (filter === 'today') return diff >= -0.5 && diff < 1.5
      if (filter === '7days') return diff >= -0.5 && diff < 7
      if (filter === '30days') return diff >= -0.5 && diff < 30
      if (filter === 'overdue') return diff < -0.5
      return true
    })

    return filtered
  }

  // 🧠 Jeżeli użytkownik poprosił o listę zadań – dołącz je jako wiadomość AI typu "tasks"
  const maybeHandleTaskQuery = async (userText: string): Promise<boolean> => {
    const match = detectFilterFromMessage(userText)
    if (!match || !token) return false

    const newId = sessionId || startNewChat(match.title)
    const list = await fetchTasksByFilter(match.key)
    setTasks(list) // zapamiętaj ostatni zestaw, np. do "Pogrupuj tematycznie"

    const infoMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      type: 'text',
      content: `📋 Załadowano ${list.length} zadań (${match.title}).`,
      timestamp: Date.now(),
    }
    const tasksMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      type: 'tasks',
      tasks: list,
      timestamp: Date.now(),
    }

    const final = [...messages, infoMsg, tasksMsg]
    setMessages(final)
    localStorage.setItem(`chat_todoist_${newId}`, JSON.stringify(final))
    return true
  }

  // 💬 Wysyłanie wiadomości
  const handleSend = async (raw: string) => {
    const message = raw.trim()
    if (!message) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      type: 'text',
    }
    const updated = [...messages, userMsg]
    setMessages(updated)
    localStorage.setItem(`chat_todoist_${sessionId}`, JSON.stringify(updated))

    setLoading(true)
    try {
      // Najpierw sprawdź, czy to nie jest prośba o listę zadań
      const handled = await maybeHandleTaskQuery(message)
      if (handled) {
        setLoading(false)
        return
      }

      // Standardowa rozmowa z AI z kontekstem ostatnio pobranych zadań
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tasks }),
      })
      const data = await res.json()
      const reply = (data.reply || data.content || '🤖 Brak odpowiedzi od AI.').trim()

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        type: 'text',
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

  // 🧠 Pogrupuj obecnie załadowane zadania (z ostatniego zapytania o listę)
  const handleGroupTasks = async () => {
    if (!tasks.length) {
      await handleSend('Nie mam żadnych zadań do pogrupowania.')
      return
    }
    const now = new Date()
    await handleSend(
      `Pogrupuj te zadania tematycznie na najbliższy okres (od ${now.toLocaleDateString('pl-PL')}).`
    )
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
      {/* Status */}
      <div className="text-sm font-medium text-green-600 mb-1">
        🟢 Połączono z Todoist
      </div>

      {/* Panel akcji (bez filtrów i bez listy zadań) */}
      <div className="flex justify-end gap-3">
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

      {/* Czat */}
      <div className="flex-1 overflow-y-auto bg-white border rounded-xl p-3 shadow-sm">
        {messages.map((m) => {
          if (m.type === 'tasks' && m.tasks) {
            // Wiadomość asystenta w formie kart zadań
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-left"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {m.tasks.map((t) => (
                    <div key={t.id} className="cursor-default">
                      <TaskCard task={t as any} token={token} onAction={() => {}} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          }

          // zwykła bańka tekstowa
          return (
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
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                  {m.content || ''}
                </ReactMarkdown>
              </div>
            </motion.div>
          )
        })}
        {loading && <div className="text-center text-gray-500 text-sm">⏳ AI myśli...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-2">
        <input
          ref={inputRef}
          type="text"
          placeholder='Napisz np. „Pokaż mi taski na dziś”'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              const value = (e.currentTarget as HTMLInputElement).value
              handleSend(value)
              ;(e.currentTarget as HTMLInputElement).value = ''
            }
          }}
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            const v = inputRef.current?.value?.trim()
            if (!loading && v) {
              handleSend(v)
              if (inputRef.current) inputRef.current.value = ''
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
