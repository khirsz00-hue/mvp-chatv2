'use client'

import { useState, useEffect } from 'react'
import Chat from '@/components/Chat'
import TodoistConnection from '@/components/TodoistConnection'
import TodoistAuthButton from '@/components/TodoistAuthButton'
import ChatHistorySidebar from '@/components/ChatHistorySidebar'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function HomePage() {
  const [active, setActive] = useState<'todoist' | 'six_hats'>('todoist')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  // 🔹 Wczytaj token z URL lub localStorage
  useEffect(() => {
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

  // 🧠 Wczytaj zapisany czat po kliknięciu w sidebar
  useEffect(() => {
    if (!selectedChatId) return
    const saved = localStorage.getItem(selectedChatId)
    if (saved) setMessages(JSON.parse(saved))
  }, [selectedChatId])

  const handleSend = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    localStorage.setItem(selectedChatId || 'chat_temp', JSON.stringify(updated))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      const data = await res.json()
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
      }

      const newHistory = [...updated, aiMsg]
      setMessages(newHistory)
      localStorage.setItem(selectedChatId || 'chat_temp', JSON.stringify(newHistory))
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Wystąpił błąd podczas komunikacji z AI.',
      }
      setMessages(prev => [...prev, errorMsg])
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* 📜 Sidebar z historią czatów */}
      <ChatHistorySidebar onSelect={setSelectedChatId} />

      {/* Główna zawartość */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-6">
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
    </div>
  )
}
