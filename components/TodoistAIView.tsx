'use client'

import { useState, useEffect } from 'react'
import Chat, { ChatMessage } from './Chat'

export default function TodoistAIView() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [tasks, setTasks] = useState<any[]>([]) // 👈 przechowujemy taski z Todoista

  // 🔹 Pobierz token z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('todoist_token')
    if (saved) setToken(saved)
  }, [])

  // 🔹 Pobierz aktualne zadania (np. na dziś)
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

  // 💬 Funkcja do wysyłania wiadomości do AI
  const handleSend = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    const updated = [...messages, userMsg]
    setMessages(updated)

    try {
      // 🧩 Kontekst = lista zadań z Todoista
      const contextTasks = tasks
        .map((t) => `- ${t.content}${t.due?.date ? ` (termin: ${t.due.date})` : ''}`)
        .join('\n')

      const contextPrompt = `
Użytkownik ma następujące zadania w Todoist:
${contextTasks || '(Brak zadań na dziś)'}

Jego wiadomość: "${message}"

Odpowiedz w języku polskim, jasno i praktycznie.
Jeśli użytkownik prosi o pogrupowanie, zaproponuj logiczne kategorie i ich nazwy.
Jeśli pyta o priorytety lub plan dnia, zaproponuj kolejność wykonania.
Nie powtarzaj listy zadań dosłownie, tylko przedstaw przetworzoną analizę.
      `.trim()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: contextPrompt }),
      })

      if (!res.ok) throw new Error('Błąd odpowiedzi z AI')
      const data = await res.json()

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || '⚠️ Brak odpowiedzi od AI.',
        timestamp: Date.now(),
      }

      setMessages([...updated, aiMsg])
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
