'use client'

import { useEffect, useState } from 'react'
import NewChatSidebar from '@/components/NewChatSidebar'
import AssistantSelector from '@/components/AssistantSelector'
import TodoistConnection from '@/components/TodoistConnection'
import TodoistAuthButton from '@/components/TodoistAuthButton'
import type { AssistantKey } from '@/utils/chatStorage'

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'assistants'>('tasks')
  const [assistant, setAssistant] = useState<AssistantKey>('Todoist Helper')

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Page header with controls */}
      <header className="border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Tab Navigation */}
            <nav className="flex gap-2" role="tablist">
              <button 
                onClick={() => setActiveTab('tasks')} 
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'tasks' 
                    ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-glow' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
                }`}
                role="tab"
                aria-selected={activeTab === 'tasks'}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Lista zadań
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('calendar')} 
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'calendar' 
                    ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-glow' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
                }`}
                role="tab"
                aria-selected={activeTab === 'calendar'}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Kalendarz
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('assistants')} 
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'assistants' 
                    ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-glow' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
                }`}
                role="tab"
                aria-selected={activeTab === 'assistants'}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Asystenci
                </div>
              </button>
            </nav>

            {/* Assistant Selector */}
            <div className="flex-shrink-0">
              <AssistantSelector value={assistant} onChange={(v) => setAssistant(v as AssistantKey)} options={['Todoist Helper', 'AI Planner', '6 Hats']} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Chat Sidebar */}
        <NewChatSidebar assistant={assistant} onAssistantChange={(a) => setAssistant(a)} />

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="h-full p-6">
            {activeTab === 'tasks' && (
              <>
                {!token ? (
                  <div className="flex items-center justify-center h-full">
                    <TodoistAuthButton />
                  </div>
                ) : (
                  <TodoistConnection token={token} onDisconnect={() => { localStorage.removeItem('todoist_token'); setToken(null) }} assistant={assistant} />
                )}
              </>
            )}

            {activeTab === 'calendar' && (
              <div className="card p-8 max-w-2xl mx-auto animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Kalendarz</h2>
                    <p className="text-sm text-gray-500">Zarządzaj swoim czasem efektywnie</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-accent-50 to-brand-50 rounded-xl p-6 border border-accent-100">
                  <p className="text-gray-600">📅 Widok kalendarza w przygotowaniu. Wkrótce będzie można planować zadania z AI Planner w widoku kalendarza.</p>
                </div>
              </div>
            )}

            {activeTab === 'assistants' && (
              <div className="card p-8 max-w-2xl mx-auto animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Asystenci AI</h2>
                    <p className="text-sm text-gray-500">Zarządzaj swoimi asystentami</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-xl p-6 border border-brand-100">
                  <p className="text-gray-600">🤖 Panel zarządzania asystentami w przygotowaniu. Tutaj będzie można dostosować ustawienia i konfigurację każdego asystenta.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
