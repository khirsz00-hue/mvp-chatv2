'use client'

import Header from './Header'
import Sidebar, { AssistantId } from './Sidebar'
import { ReactNode, useState, useEffect } from 'react'
import { TasksAssistant } from '@/components/assistant/TasksAssistant'
import { JournalAssistant } from '@/components/journal/JournalAssistant'

interface MainLayoutProps {
  children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [activeView, setActiveView] = useState<AssistantId>('tasks')

  useEffect(() => {
    // Odczytaj zapisaną preferencję widoku, jeśli istnieje
    try {
      const stored = localStorage.getItem('active_assistant') as AssistantId | null
      if (stored && ['tasks', 'planning', 'journal', 'decisions', 'support'].includes(stored)) {
        setActiveView(stored)
      }
    } catch {}
  }, [])
  
  const renderAssistant = () => {
    switch (activeView) {
      case 'tasks':
        return <TasksAssistant />
      
      case 'journal':
        return <JournalAssistant />
      
      case 'planning':
      case 'decisions':
      case 'support':
        return (
          <div className="glass p-8 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">
              {activeView === 'planning' && 'Asystent Planowania'}
              {activeView === 'decisions' && 'Podejmowanie Decyzji'}
              {activeView === 'support' && 'Wsparcie'}
            </h2>
            <p className="text-muted-foreground">
              Ten asystent będzie dodany w kolejnych etapach
            </p>
          </div>
        )
      
      default:
        return (
          <div className="glass p-8 rounded-2xl text-center">
            <p className="text-muted-foreground">Wybierz asystenta z menu</p>
          </div>
        )
    }
  }
  
  const handleNavigate = (view: AssistantId) => {
    setActiveView(view)
    try { localStorage.setItem('active_assistant', view) } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-x-hidden">
      <Header />
      <div className="flex">
        <Sidebar activeView={activeView} onNavigate={handleNavigate} />
        <main className="flex-1 p-6 overflow-x-hidden">
          {children || renderAssistant()}
        </main>
      </div>
    </div>
  )
}
