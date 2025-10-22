'use client'

import { useEffect, useState } from 'react'
import NewChatSidebar from '@/components/NewChatSidebar'
import TodoistConnection from '@/components/TodoistConnection'
import TodoistAuthButton from '@/components/TodoistAuthButton'

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'assistants'>('tasks')

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 app-full-width">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800">AI Assistants PRO</h1>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('tasks')} className={`px-3 py-1.5 rounded ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Lista zadań</button>
          <button onClick={() => setActiveTab('calendar')} className={`px-3 py-1.5 rounded ${activeTab === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Kalendarz</button>
          <button onClick={() => setActiveTab('assistants')} className={`px-3 py-1.5 rounded ${activeTab === 'assistants' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Asystenci</button>
        </div>
      </header>

      <main className="flex flex-1">
        <NewChatSidebar />

        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'tasks' && (
            <>
              {!token ? (
                <div className="flex items-center justify-center h-64">
                  <TodoistAuthButton />
                </div>
              ) : (
                <TodoistConnection token={token} onDisconnect={() => { localStorage.removeItem('todoist_token'); setToken(null) }} />
              )}
            </>
          )}

          {activeTab === 'calendar' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Kalendarz (placeholder)</h2>
              <p className="text-sm text-gray-600">Widok kalendarza do integracji z AI Planner.</p>
            </div>
          )}

          {activeTab === 'assistants' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Asystenci</h2>
              <p className="text-sm text-gray-600">Zarządzaj asystentami i konfiguracją.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
