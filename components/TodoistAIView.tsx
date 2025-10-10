'use client'

import { useState, useEffect } from 'react'
import Chat, { ChatMessage } from './Chat'

export default function TodoistAIView() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [lastFetchedTasks, setLastFetchedTasks] = useState<any[]>([])

  // 🔹 Pobierz token z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('todoist_token')
    if (saved) setToken(saved)
  }, [])

  // 💬 Pobierz zadania z Todoista
  const fetchTasks = async (period: 'today' | 'tomorrow') => {
    if (!token) {
      return {
        reply: '❌ Brak tokena Todoist — zaloguj się w zakładce Todoist Helper 🔒',
        type: 'text' as const,
        tasks: [],
      }
    }

    try {
      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const tasks = await res.json()

      const today = new Date()
      const targetDate =
        period === 'tomorrow'
          ? new Date(today.setDate(today.getDate() + 1))
          : today

      const dateString = targetDate.toISOString().split('T')[0]
      const filtered = tasks.filter((t: any) => t.due?.date === dateString)

      setLastFetchedTasks(filtered) // 🧠 zapisz do pamięci dla kontekstu AI

      if (filtered.length === 0) {
        return {
          reply:
            period === 'tomorrow'
              ? 'Nie masz jeszcze zaplanowanych zadań na jutro ✅'
              : 'Nie masz dziś żadnych zadań ✅',
          type: 'tasks' as const,
          tasks: [],
        }
      }

      return {
        reply:
          period === 'tomorrow'
            ? '📅 Twoje zadania na jutro:'
            : '📋 Twoje zadania na dziś:',
        type: 'tasks' as const,
        tasks: filtered.map((t: any) => ({
          id: t.id,
          content: t.content,
          due: t.due?.date,
          priority: t.priority,
        })),
      }
    } catch (err) {
      console.error('❌ Błąd Todoist:', err)
      return {
        reply: '⚠️ Nie udało się pobrać zadań z Todoista 😞',
        type: 'text' as const,
        tasks: [],
      }
    }
  }

  // 🧠 Obsługa wiadomości i kontekstu
  const handleSend = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    const updated = [...messages, userMsg]
    setMessages(updated)

    const lower = message.toLowerCase()

    // 🔍 Komendy: "dzisiaj" / "jutro"
    if (lower.includes('dzis') || lower.includes('dziś')) {
      const data = await fetchTasks('today')
      setMessages([
        ...updated,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
          type: 'tasks',
          tasks: data.tasks,
        },
      ])
      return
    }

    if (lower.includes('jutro') || lower.includes('tomorrow')) {
      const data = await fetchTasks('tomorrow')
      setMessages([
        ...updated,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
          type: 'tasks',
          tasks: data.tasks,
        },
      ])
      return
    }

    // 🧩 Rozmowa z AI — z kontekstem tasków
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: lastFetchedTasks.map((t) => t.content).join('\n'),
        }),
      })

      const data = await res.json()
      const reply =
        data.reply || '🤖 Nie mam pewności, jak odpowiedzieć na to pytanie.'

      setMessages([
        ...updated,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
          type: 'text',
        },
      ])
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setMessages([
        ...updated,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Wystąpił błąd komunikacji z AI.',
          timestamp: Date.now(),
          type: 'text',
        },
      ])
    }
  }

  return (
    <div className="flex flex-col h-full p-3">
      <Chat
        onSend={handleSend}
        messages={messages}
        assistant="global"
        hideHistory={false}
      />
    </div>
  )
}
