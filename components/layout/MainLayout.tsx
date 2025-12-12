'use client'

import React, { useState, useEffect } from 'react'
import Header from './Header'
import Sidebar, { AssistantId } from './Sidebar'
import TodoistTasksView from '../TodoistTasksView'
import Chat from '../Chat'
import PlaceholderView from '../views/PlaceholderView'

interface MainLayoutProps {
  children?: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [activeAssistant, setActiveAssistant] = useState<AssistantId>('todoist')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)

  // Handle Todoist token
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

  // Check for user (could be extended with Supabase auth)
  useEffect(() => {
    // Placeholder for auth check
    // In real implementation, this would check Supabase session
  }, [])

  const handleSignOut = () => {
    // Placeholder for sign out logic
    setUser(null)
  }

  const handleSignIn = () => {
    // Placeholder for sign in logic
    // In real implementation, this would redirect to Supabase auth
  }

  const renderContent = () => {
    switch (activeAssistant) {
      case 'todoist':
        if (!token) {
          return (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
                  Połącz się z Todoist
                </h2>
                <p className="text-gray-600 mb-6">
                  Aby korzystać z Todoist Helper, musisz połączyć swoje konto Todoist.
                </p>
                <a
                  href="/api/todoist/auth"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 transition-colors shadow-soft"
                >
                  Połącz z Todoist
                </a>
              </div>
            </div>
          )
        }
        return (
          <TodoistTasksView
            token={token}
            onUpdate={() => {}}
            hideHeader={false}
          />
        )
      
      case 'chat':
        return (
          <div className="max-w-4xl mx-auto">
            <Chat
              assistant="todoist"
              hideHistory={false}
            />
          </div>
        )
      
      case 'planner':
        return (
          <PlaceholderView
            icon="📅"
            title="AI Planner"
            description="Inteligentne planowanie dnia z pomocą AI"
          />
        )
      
      case 'journal':
        return (
          <PlaceholderView
            icon="📔"
            title="Journal"
            description="Codzienny dziennik refleksji i rozwoju osobistego"
          />
        )
      
      case '6hats':
        return (
          <PlaceholderView
            icon="🎩"
            title="Six Thinking Hats"
            description="Framework decyzyjny wykorzystujący metodę 6 kapeluszy"
          />
        )
      
      default:
        return (
          <TodoistTasksView
            token={token}
            onUpdate={() => {}}
            hideHeader={false}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Header
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
      
      <div className="flex relative">
        <Sidebar
          activeAssistant={activeAssistant}
          onAssistantChange={setActiveAssistant}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 p-6 min-h-[calc(100vh-4rem)]">
          {children || renderContent()}
        </main>
      </div>
    </div>
  )
}
