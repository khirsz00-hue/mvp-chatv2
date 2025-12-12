'use client'

import Header from './Header'
import Sidebar, { AssistantId } from './Sidebar'
import { ReactNode, useState } from 'react'

interface MainLayoutProps {
  children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [activeView, setActiveView] = useState<AssistantId>('tasks')
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Header />
      <div className="flex">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <main className="flex-1 p-6">
          {children || (
            <div className="max-w-4xl mx-auto">
              <div className="glass p-8 rounded-2xl text-center">
                <h2 className="text-2xl font-bold mb-4">
                  Wybierz asystenta z menu bocznego
                </h2>
                <p className="text-gray-600">
                  Aktywny widok: <strong>{activeView}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  Asystenci będą dodani w kolejnych etapach (2B, 2C, 2D)
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
