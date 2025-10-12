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
  const handleGroupTasks = async
