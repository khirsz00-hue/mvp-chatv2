'use client'

import { useState } from 'react'
import TodoistTasksView from './TodoistTasksView'
import TodoistAIView from './TodoistAIView'
import GlobalDialog from './GlobalDialog'
import TaskDialog from './TaskDialog'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
}

export default function TodoistConnection({ token, onDisconnect }: TodoistConnectionProps) {
  const [mode, setMode] = useState<'tasks' | 'ai'>('tasks')
  const [selectedChat, setSelectedChat] = useState<{ key: string; title: string } | null>(null)

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

      {/* 🧠 Modal kontynuacji czatu (po kliknięciu np. z listy) */}
      {selectedChat && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3"
          onClick={() => setSelectedChat(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-fadeIn max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">
                💬 {selectedChat.title}
              </h2>
              <button
                onClick={() => setSelectedChat(null)}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                ✕ Zamknij
              </button>
            </div>

            {selectedChat.key === 'chat_global' ? (
              <GlobalDialog onClose={() => setSelectedChat(null)} />
            ) : (
              <TaskDialog
                task={{
                  id: selectedChat.key.replace('chat_', ''),
                  content: selectedChat.title,
                }}
                mode="help"
                onClose={() => setSelectedChat(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
