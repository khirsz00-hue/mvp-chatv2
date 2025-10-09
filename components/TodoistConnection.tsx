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
    <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-50 border border-green-200 rounded-xl overflow-hidden">
      {/* 🔘 Pasek górny z przełącznikiem trybu */}
      <div className="flex justify-between items-center p-2 px-4 bg-white border-b">
        <div className="flex items-center gap-2">
          {/* 🧭 Przełącznik widoków */}
          <button
            onClick={() => setMode('tasks')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === 'tasks'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Lista zadań
          </button>

          <button
            onClick={() => setMode('ai')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === 'ai'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🤖 Asystent AI
          </button>
        </div>

        {/* 🔌 Przyciski akcji */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-green-700">✅ Połączono z Todoist</span>
          <button
            onClick={onDisconnect}
            className="text-xs px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition"
          >
            Odłącz
          </button>
        </div>
      </div>

      {/* 🔄 Dynamiczna treść zależnie od trybu */}
      <div className="flex-1">
        {mode === 'tasks' ? (
          <TodoistTasksView token={token} />
        ) : (
          <TodoistAIView token={token} />
        )}
      </div>
    </div>
  )
}
