'use client'

import { useState, useEffect } from 'react'
import TodoistTasksView from './TodoistTasksView'
import TodoistAIView from './TodoistAIView'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
}

export default function TodoistConnection({ token, onDisconnect }: TodoistConnectionProps) {
  const [mode, setMode] = useState<'tasks' | 'ai'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('todoist_mode')
      if (saved === 'ai' || saved === 'tasks') return saved
    }
    return 'tasks'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('todoist_mode', mode)
    }
  }, [mode])

  return (
    <div className="relative flex flex-col h-[calc(100vh-100px)] bg-gray-50 border border-green-200 rounded-xl overflow-hidden">
      <div className="flex justify-between items-center p-2 px-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setMode('tasks')}
              className={`px-4 py-1.5 text-sm font-medium transition ${
                mode === 'tasks'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Lista zadań
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-1.5 text-sm font-medium transition ${
                mode === 'ai'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Asystent AI
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-green-700 whitespace-nowrap">
            Połączono z Todoist
          </span>
          <button
            onClick={onDisconnect}
            className="text-xs px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition"
          >
            Odłącz
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {mode === 'tasks' ? (
          <TodoistTasksView token={token} />
        ) : (
          <TodoistAIView />
        )}
      </div>
    </div>
  )
}
