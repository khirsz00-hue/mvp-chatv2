'use client'

import { useState, useEffect } from 'react'
import Chat from '@/components/Chat'
import TodoistConnection from '@/components/TodoistConnection'
import TodoistAuthButton from '@/components/TodoistAuthButton'

export default function HomePage() {
  const [active, setActive] = useState<'todoist' | 'six_hats'>('todoist')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [token, setToken] = useState<string | null>(null)

  // 🔹 Sprawdzamy, czy token istnieje w URL lub localStorage
  useEffect(() => {
    // po autoryzacji wraca `?todoist_token=XYZ`
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('todoist_token')

    if (urlToken) {
      localStorage.setItem('todoist_token', urlToken)
      setToken(urlToken)
      window.history.replaceState({}, document.title, '/')
    } else {
      const saved = localStorage.getItem('todoist_token')
      if (saved) setToken(saved)
    }
  }, [])

  const handleSend = async (message: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: message }])

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    const data = await res.json()

    setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-4 flex gap-3">
        <button
          onClick={() => setActive('todoist')}
          className={`px-3 py-1 rounded-lg text-sm ${
            active === 'todoist' ? 'bg-blue-600 text-white' : 'bg-neutral-200'
          }`}
        >
          Todoist Helper
        </button>
        <button
          onClick={() => setActive('six_hats')}
          className={`px-3 py-1 rounded-lg text-sm ${
            active === 'six_hats' ? 'bg-blue-600 text-white' : 'bg-neutral-200'
          }`}
        >
          6 Hats Assistant
        </button>
      </div>

      {/* ✅ Sekcja integracji Todoist */}
      {active === 'todoist' && (
        <>
          {!token ? (
            <TodoistAuthButton />
          ) : (
            <TodoistConnection
              token={token}
              onDisconnect={() => {
                localStorage.removeItem('todoist_token')
                setToken(null)
              }}
            />
          )}
        </>
      )}

      {/* 💬 Czat asystenta */}
      <div className="mt-6">
        <Chat onSend={handleSend} messages={messages} />
      </div>
    </main>
  )
}
