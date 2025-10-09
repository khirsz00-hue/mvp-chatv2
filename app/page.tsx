'use client'

import { useState, useEffect } from 'react'
import TodoistConnection from '@/components/TodoistConnection'
import TodoistAuthButton from '@/components/TodoistAuthButton'
import Chat from '@/components/Chat'
import ChatSidebar from '@/components/ChatSidebar'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function HomePage() {
  const [active, setActive] = useState<'todoist' | 'six_hats'>('todoist')
  const [todoistMessages, setTodoistMessages] = useState<ChatMessage[]>([])
  const [sixHatsMessages, setSixHatsMessages] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)

  // 🧩 Wczytaj historię rozmów
  useEffect(() => {
    if (typeof window === 'undefined') return

    const todoistSaved = localStorage.getItem('chat_todoist')
    const sixHatsSaved = localStorage.getItem('chat_six_hats')

    if (todoistSaved) setTodoistMessages(JSON.parse(todoistSaved))
    if (sixHatsSaved) setSixHatsMessages(JSON.parse(sixHatsSaved))
  }, [])

  // 💾 Zapisuj historię po zmianach
  useEffect(() => {
    if (todoistMessages.length > 0) {
      localStorage.setItem('chat_todoist', JSON.stringify(todoistMessages))
      window.dispatchEvent(new Event('chatUpdated'))
    }
  }, [todoistMessages])

  useEffect(() => {
    if (sixHatsMessages.length > 0) {
      localStorage.setItem('chat_six_hats', JSON.stringify(sixHatsMessages))
      window.dispatchEvent(new Event('chatUpdated'))
    }
  }, [sixHatsMessages])

  // 🔹 Obsługa tokena Todoista
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

  // 💬 Wysyłanie do Six Hats
  const handleSendSixHats = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    const updated = [...sixHatsMessages, userMsg]
    setSixHatsMessages(updated)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, assistant: 'six_hats' }),
      })

      if (!res.ok) throw new Error('Błąd odpowiedzi z AI')
      const data = await res.json()

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || '⚠️ Brak odpowiedzi od AI.',
        timestamp: Date.now(),
      }

      setSixHatsMessages([...updated, aiMsg])
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setSixHatsMessages((prev) => [
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

  // 💬 Wysyłanie do Todoista (placeholder)
  const handleSendTodoist = async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    setTodoistMessages((prev) => [...prev, userMsg])
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 🔹 Nagłówek */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800">AI Assistants PRO</h1>
        <nav className="flex gap-2">
          <button
            onClick={() => setActive('todoist')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              active === 'todoist' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Todoist Helper
          </button>
          <button
            onClick={() => setActive('six_hats')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              active === 'six_hats' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            6 Hats Assistant
          </button>
        </nav>
      </header>

      {/* 🔸 Główna sekcja */}
      <main className="flex flex-1 overflow-hidden">
        <ChatSidebar />

        <div className="flex-1 p-4 overflow-y-auto">
          {active === 'todoist' && (
            <>
              {!token ? (
                <div className="flex items-center justify-center h-full">
                  <TodoistAuthButton />
                </div>
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

          {active === 'six_hats' && (
            <div className="max-w-4xl mx-auto w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">🎩 Six Hats Assistant</h2>
              <p className="text-sm text-gray-600 mb-4">
                Zadawaj pytania, a asystent pomoże Ci spojrzeć na problem z sześciu perspektyw
                myślenia (biała, czerwona, czarna, żółta, zielona, niebieska).
              </p>
              <Chat
                onSend={handleSendSixHats}
                messages={sixHatsMessages}
                assistant="six_hats"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
