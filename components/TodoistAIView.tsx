'use client'

import { useState } from 'react'
import Chat, { ChatMessage } from './Chat'

export default function TodoistAIView() {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const handleSend = async (msg: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])

    const token = localStorage.getItem('todoist_token')
    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '🔒 Brak tokena Todoist — zaloguj się w Todoist Helper.',
          timestamp: Date.now(),
        },
      ])
      return
    }

    const lower = msg.toLowerCase()

    // 🧩 Obsługa komendy "zadania na dziś"
    if (lower.includes('dzis') || lower.includes('dziś')) {
      try {
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Błąd pobierania')
        const tasks = await res.json()
        const today = new Date().toISOString().split('T')[0]
        const todays = tasks.filter((t: any) => t.due?.date === today)

        if (todays.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: '✅ Nie masz dziś żadnych zaplanowanych zadań.',
              timestamp: Date.now(),
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: '📅 Zadania na dziś:',
              timestamp: Date.now(),
              type: 'tasks',
              tasks: todays.map((t: any) => ({
                id: t.id,
                content: t.content,
                due: t.due?.date || null,
                priority: t.priority,
              })),
            },
          ])
        }
      } catch (err) {
        console.error('❌ Błąd Todoist:', err)
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '❌ Nie udało się pobrać zadań z Todoista.',
            timestamp: Date.now(),
          },
        ])
      }
      return
    }

    // 🧠 Jeśli nie komenda Todoista — odpowiedź "domyślna"
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          '🤖 Wpisz np. "pokaż zadania na dziś" albo "pokaż zaległe".',
        timestamp: Date.now(),
      },
    ])
  }

  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-4 border-b bg-gray-50 font-semibold text-gray-800">
        🤖 Asystent Todoist AI
      </div>
      <div className="p-4">
        <Chat
          onSend={handleSend}
          messages={messages}
          assistant="global"
          hideHistory={false}
        />
      </div>
    </div>
  )
}
