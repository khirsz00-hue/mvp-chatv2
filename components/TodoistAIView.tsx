'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import remarkGfm from 'remark-gfm'
import TaskCard from './TaskCard'
import type { AssistantKey } from '../utils/chatStorage'
import { storageKeyFor, sessionsKeyFor, upsertSession, loadConversation, saveConversation } from '../utils/chatStorage'

type TodoistTask = {
  id: string
  content: string
  due?: { date: string } | null
  priority?: number
  completed?: boolean
  project_name?: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  timestamp: number
  type?: 'text' | 'tasks'
  content?: string
  tasks?: TodoistTask[]
}

export default function TodoistAIView({
  token,
  assistant,
}: {
  token: string
  assistant?: AssistantKey
}) {
  const assistantKey: AssistantKey = (assistant || 'AI Planner') as AssistantKey
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [tasks, setTasks] = useState<TodoistTask[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // helper storage key
  const storageKey = storageKeyFor(assistantKey, sessionId)
  const sessionsKey = sessionsKeyFor(assistantKey)

  // autoscroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // load history on chatSelect (sidebar)
  useEffect(() => {
    const handleChatSelect = (event: any) => {
      const det = event.detail || {}
      // determine if this chatSelect is for this assistant
      if (!det?.mode) return
      // when sidebar dispatches, it uses mode: 'todoist' for todoist tasks; for planner we might use other signals
      const id = det.task?.id || det.sessionId
      if (!id) return
      const key = storageKeyFor(assistantKey, id)
      const saved = loadConversation(key)
      if (saved && saved.length) {
        setMessages(saved)
        setSessionId(id)
      }
    }
    window.addEventListener('chatSelect', handleChatSelect)
    return () => window.removeEventListener('chatSelect', handleChatSelect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantKey])

  // create new session entry
  const startNewChat = (title: string) => {
    const newId = crypto.randomUUID()
    setSessionId(newId)
    setMessages([])
    const newEntry = { id: newId, title, timestamp: Date.now(), last: '' }
    upsertSession(sessionsKey, newEntry)
    window.dispatchEvent(new Event('chatUpdated'))
    return newId
  }

  // fetch tasks helper
  const fetchTasksByFilter = async (filter: 'today' | '7days' | '30days' | 'overdue') => {
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const all = await res.json()
    const now = new Date()

    const filtered: TodoistTask[] = all.filter((t: any) => {
      const dueDateRaw = t.due?.date ?? (typeof t.due === 'string' ? t.due : null)
      if (!dueDateRaw) return false
      const due = new Date(dueDateRaw)
      const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (filter === 'today') return diff >= -0.5 && diff < 1.5
      if (filter === '7days') return diff >= -0.5 && diff < 7
      if (filter === '30days') return diff >= -0.5 && diff < 30
      if (filter === 'overdue') return diff < -0.5
      return true
    })

    return filtered.map((t: any) => ({
      id: t.id,
      content: t.content,
      due: t.due ? { date: t.due.date ?? t.due } : null,
      priority: t.priority,
      completed: t.completed,
      project_name: t.project_name || t.project || '',
    }))
  }

  const detectFilterFromMessage = (text: string): null | { key: 'today' | '7days' | '30days' | 'overdue'; title: string } => {
    const t = text.toLowerCase()
    if (t.includes('dziś') || t.includes('dzis') || t.includes('dzisiaj') || t.includes('na dziś') || t.includes('na dzis')) return { key: 'today', title: 'Zadania na dziś' }
    if (t.includes('tydzień') || t.includes('tydzien') || t.includes('7 dni') || t.includes('na tydzień')) return { key: '7days', title: 'Zadania na tydzień' }
    if (t.includes('miesiąc') || t.includes('miesiac') || t.includes('30 dni') || t.includes('na miesiąc')) return { key: '30days', title: 'Zadania na miesiąc' }
    if (t.includes('przetermin')) return { key: 'overdue', title: 'Zadania przeterminowane' }
    return null
  }

  // if message requests tasks -> fetch and insert tasks message
  const maybeHandleTaskQuery = async (userText: string): Promise<boolean> => {
    const match = detectFilterFromMessage(userText)
    if (!match || !token) return false

    const newId = sessionId || startNewChat(match.title)
    const list = await fetchTasksByFilter(match.key)
    setTasks(list)
    const infoMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', type: 'text', content: `📋 Załadowano ${list.length} zadań (${match.title}).`, timestamp: Date.now() }
    const tasksMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', type: 'tasks', tasks: list, timestamp: Date.now() }

    const final = [...messages, infoMsg, tasksMsg]
    setMessages(final)
    const sk = storageKeyFor(assistantKey, newId)
    saveConversation(sk, final)
    upsertSession(sessionsKey, { id: newId, title: match.title, timestamp: Date.now(), last: (infoMsg.content || '').slice(0, 300) })
    window.dispatchEvent(new Event('chatUpdated'))
    return true
  }

  const handleSend = async (raw: string) => {
    const message = raw.trim()
    if (!message) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message, timestamp: Date.now(), type: 'text' }
    const updated = [...messages, userMsg]
    setMessages(updated)
    const sk = storageKeyFor(assistantKey, sessionId)
    saveConversation(sk, updated)
    upsertSession(sessionsKey, { id: sessionId, title: `Rozmowa ${new Date().toLocaleString()}`, timestamp: Date.now(), last: message.slice(0, 300) })
    window.dispatchEvent(new Event('chatUpdated'))

    setLoading(true)
    try {
      const handled = await maybeHandleTaskQuery(message)
      if (handled) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tasks, assistant: assistantKey }),
      })
      const data = await res.json()
      const reply = (data.reply || data.content || '🤖 Brak odpowiedzi od AI.').trim()
      const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: Date.now(), type: 'text' }
      const final = [...updated, aiMsg]
      setMessages(final)
      saveConversation(storageKeyFor(assistantKey, sessionId), final)
      upsertSession(sessionsKey, { id: sessionId, title: `Rozmowa ${new Date().toLocaleString()}`, timestamp: Date.now(), last: aiMsg.content.slice(0, 300) })
      window.dispatchEvent(new Event('chatUpdated'))
    } catch (err) {
      console.error('❌ Błąd AI:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGroupTasks = async () => {
    if (!tasks.length) {
      await handleSend('Nie mam żadnych zadań do pogrupowania.')
      return
    }
    const now = new Date()
    await handleSend(`Pogrupuj te zadania tematycznie na najbliższy okres (od ${now.toLocaleDateString('pl-PL')}).`)
  }

  const handleClear = () => {
    if (confirm('Czy na pewno chcesz wyczyścić czat?')) {
      setMessages([])
      const key = storageKeyFor(assistantKey, sessionId)
      localStorage.removeItem(key)
      // also update sessions index last
      upsertSession(sessionsKey, { id: sessionId, title: `Rozmowa ${new Date().toLocaleString()}`, timestamp: Date.now(), last: '' })
      window.dispatchEvent(new Event('chatUpdated'))
    }
  }

  return (
    <div className="flex flex-col h-[85vh] max-h-[85vh] p-3 space-y-3 overflow-hidden">
      <div className="text-sm font-medium text-green-600 mb-1">🟢 Połączono z Todoist</div>

      <div className="flex justify-end gap-3">
        <button onClick={() => startNewChat('Nowy czat')} className="text-sm text-blue-600 hover:text-blue-800">➕ Nowy czat</button>
        <button onClick={handleClear} className="text-sm text-red-600 hover:text-red-800">🗑️ Wyczyść</button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white border rounded-xl p-3 shadow-sm">
        {messages.map((m) => {
          if (m.type === 'tasks' && m.tasks) {
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-left">
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

          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">{m.content || ''}</ReactMarkdown>
              </div>
            </motion.div>
          )
        })}
        {loading && <div className="text-center text-gray-500 text-sm">⏳ AI myśli...</div>}
        <div ref={bottomRef} />
      </div>

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
        <button onClick={() => { const v = inputRef.current?.value?.trim(); if (!loading && v) { handleSend(v); if (inputRef.current) inputRef.current.value = '' } }} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">Wyślij</button>
      </div>

      {tasks.length > 0 && (
        <div className="flex justify-center pt-2">
          <button onClick={handleGroupTasks} disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50">🧠 Pogrupuj tematycznie</button>
        </div>
      )}
    </div>
  )
}
