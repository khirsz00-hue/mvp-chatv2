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
}

export default function HomePage() {
  const [active, setActive] = useState<'todoist' | 'six_hats'>('todoist')
  const [todoistMessages, setTodoistMessages] = useState<ChatMessage[]>([])
  const [sixHatsMessages, setSixHatsMessages] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)

  // 🧩 Zapamiętaj historię oddzielnie w localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const todoistSaved = localStorage.getItem('chat_todoist')
    const sixHatsSaved = localStorage.getItem('chat_six_hats')

    if (todoistSaved) setTodoistMessages(JSON.parse(todoistSaved))
    if (sixHatsSaved) setSixHatsMessages(JSON.parse(sixHatsSaved))
  }, [])

  useEffect(() => {
    if (todoistMessages.length > 0)
      localStorage.setItem('chat_todoist', JSON.stringify(todoistMessages))
  }, [todoistMessages])

  useEffect(() => {
    if (sixHatsMessages.length > 0)
      localStorage.setItem('chat_six_hats', JSON.stringify(sixHatsMessages))
  }, [sixHatsMessages])

  // 🔹 Pobierz token Todoista
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

  // 💬 Wysyłanie wiadomości — oddzielnie dla każdego asystenta
  const handleSendSixHats = async (message: string) => {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message }
    const updated = [...sixHatsMessages, userMsg]
    setSixHatsMessages(updated)

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

      setSixHatsMessages([...updated, aiMsg])
    } catch (err) {
      setSixHatsMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: '⚠️ Błąd komunikacji z AI.' },
      ])
    }
  }

  const handleSendTodoist = async (message: string) => {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message }
    const updated = [...todoistMessages, userMsg]
    setTodoistMessages(updated)

    // (tu może być osobny endpoint np. /api/todoist-chat)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Górny pasek */}
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

      {/* Główna sekcja */}
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
              <Chat onSend={handleSendSixHats} messages={sixHatsMessages} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
