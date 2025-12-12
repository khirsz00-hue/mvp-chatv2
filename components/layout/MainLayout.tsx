'use client'

import Header from './Header'
import Sidebar, { AssistantId } from './Sidebar'
import { ReactNode, useState } from 'react'
import { TasksAssistant } from '@/components/assistant/TasksAssistant'

interface MainLayoutProps {
  children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [activeView, setActiveView] = useState<AssistantId>('tasks')
  
  const renderAssistant = () => {
    switch (activeView) {
      case 'tasks':
        return <TasksAssistant />
      
      case 'planning':
      case 'journal':
      case 'decisions':
      case 'support':
        return (
          <div className="glass p-8 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">
              {activeView === 'planning' && 'Asystent Planowania'}
              {activeView === 'journal' && 'Dziennik'}
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Header />
      <div className="flex">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <main className="flex-1 p-6">
          {children || renderAssistant()}
        </main>
      </div>
    </div>
  )
}
