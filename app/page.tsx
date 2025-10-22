'use client'

import { useState, useEffect } from 'react'
import NewChatSidebar from '@/components/NewChatSidebar'
import TodoistConnection from '@/components/TodoistConnection'
import TodoistAuthButton from '@/components/TodoistAuthButton'
import Chat, { ChatMessage } from '@/components/Chat'

export default function HomePage() {
  const [active, setActive] = useState<'todoist' | 'six_hats' | 'global'>('todoist')
  const [todoistMessages, setTodoistMessages] = useState<ChatMessage[]>([])
  const [sixHatsMessages, setSixHatsMessages] = useState<ChatMessage[]>([])
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)

  // Load saved chats and token
  useEffect(() => {
    if (typeof window === 'undefined') return
    const todoistSaved = localStorage.getItem('chat_todoist')
    const sixHatsSaved = localStorage.getItem('chat_six_hats')
    const globalSaved = localStorage.getItem('chat_global')

    if (todoistSaved) setTodoistMessages(JSON.parse(todoistSaved))
    if (sixHatsSaved) setSixHatsMessages(JSON.parse(sixHatsSaved))
    if (globalSaved) setGlobalMessages(JSON.parse(globalSaved))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
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

  // sendMessage used by Chat components (global / six_hats)
  const sendMessage = async (message: string, assistant: 'global' | 'six_hats'): Promise<string> => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-todoist-token': token } : {}),
      },
      body: JSON.stringify({ message, assistant }),
    })
    if (!res.ok) throw new Error('Błąd odpowiedzi z AI')
    const data = await res.json()
    if (data.type === 'tasks' && data.tasks?.length) {
      const taskList = data.tasks.map((t: any) => `• ${t.content}`).join('\n')
      return `${data.reply || 'Zadania:'}\n\n${taskList}`
    }
    return data.reply || '⚠️ Brak odpowiedzi od AI.'
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 app-full-width">
      {/* header */}
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
          <button
            onClick={() => setActive('global')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              active === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Global Chat
          </button>
        </nav>
      </header>

      <main className="flex flex-1 overflow-hidden w-full app-full-width">
        {/* New unified sidebar */}
        <NewChatSidebar />

        <div className="flex-1 p-4 overflow-y-auto w-full">
          {active === 'todoist' && (
            <>
              {!token ? (
                <div className="flex items-center justify-center h-full w-full">
                  <TodoistAuthButton />
                </div>
              ) : (
                <div className="w-full todoist-main-wrapper">
                  <TodoistConnection
                    token={token}
                    onDisconnect={() => {
                      localStorage.removeItem('todoist_token')
                      setToken(null)
                    }}
                  />
                </div>
              )}
            </>
          )}

          {active === 'six_hats' && (
            <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <Chat onSend={async (msg) => await sendMessage(msg, 'six_hats')} messages={sixHatsMessages} hideHistory />
            </div>
          )}

          {active === 'global' && (
            <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <Chat onSend={async (msg) => await sendMessage(msg, 'global')} messages={globalMessages} hideHistory />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
