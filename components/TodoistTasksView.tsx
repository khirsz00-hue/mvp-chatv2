'use client'

import { useState } from 'react'
import TodoistTasks from './TodoistTasks'
import ChatSidebar from './ChatSidebar'
import ChatDock from './ChatDock'

export default function TodoistTasksView({ token }: { token: string }) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days'>('today')
  const [tasks, setTasks] = useState<any[]>([])
  const [activeTask, setActiveTask] = useState<any | null>(null)

  const handleRefresh = (updated?: any[]) => updated && setTasks(updated)
  const openTaskChat = (task: any) => setActiveTask(task)
  const closeTaskChat = () => setActiveTask(null)

  return (
    <div className="flex h-full">
      {/* 🧭 Sidebar z historią czatów zadań */}
      <ChatSidebar onSelectChat={() => {}} />

      {/* 📋 Główna sekcja */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Filtry */}
        <div className="flex justify-between items-center p-3 border-b bg-white sticky top-0 z-20">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'today', label: '📅 Dziś' },
              { key: 'tomorrow', label: '➡️ Jutro' },
              { key: '7 days', label: '🗓️ Tydzień' },
              { key: 'overdue', label: '⚠️ Przeterminowane' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  filter === key ? 'bg-green-600 text-white' : 'bg-white border text-green-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista zadań */}
        <div className="flex-1 overflow-y-auto p-3">
          <TodoistTasks
            token={token}
            filter={filter}
            onChangeFilter={setFilter}
            onUpdate={handleRefresh}
            onOpenTaskChat={openTaskChat}
          />
        </div>

        {/* 💬 Czat konkretnego zadania */}
        {activeTask && (
          <div className="border-t bg-white p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700 truncate max-w-[80%]">
                💬 {activeTask.content}
              </span>
              <button
                onClick={closeTaskChat}
                className="text-xs text-gray-500 hover:text-gray-700 transition"
              >
                ← Wróć
              </button>
            </div>
            <ChatDock mode="task" task={activeTask} token={token} />
          </div>
        )}
      </div>
    </div>
  )
}
