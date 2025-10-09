'use client'

import { useState } from 'react'
import TodoistTasksView from './TodoistTasksView'
import TodoistAIView from './TodoistAIView'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
}

export default function TodoistConnection({ token, onDisconnect }: TodoistConnectionProps) {
  const [mode, setMode] = useState<'tasks' | 'ai'>('tasks')

  return (
    <div className="relative flex flex-col h-[calc(100vh-100px)] bg-gray-50 border border-green-200 rounded-xl overflow-hidden">
      {/* 🔘 Pasek górny */}
      <div className="flex justify-between items-center p-2 px-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          {/* 🧭 Przełącznik widoków */}
          <div className="flex bg-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setMode('tasks')}
              className={`px-4 py-1.5 text-sm font-medium transition ${
                mode === 'tasks'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              📋 Lista zadań
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-1.5 text-sm font-medium transition ${
                mode === 'ai'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              🤖 Asystent AI
            </button>
          </div>
        </div>

        {/* 🔌 Status połączenia */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-green-700 whitespace-nowrap">
            ✅ Połączono z Todoist
          </span>
          <button
            onClick={onDisconnect}
            className="text-xs px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition"
          >
            Odłącz
          </button>
        </div>
      </div>

      {/* 🔄 Dynamiczna zawartość */}
      <div className="flex-1 relative">
        {mode === 'tasks' ? (
          <TodoistTasksView token={token} />
        ) : (
          <TodoistAIView token={token} />
        )}
      </div>
    </div>
  )
}
