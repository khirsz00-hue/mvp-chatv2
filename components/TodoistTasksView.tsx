'use client'

import { useState } from 'react'
import TodoistTasks from './TodoistTasks'
import ChatDock from './ChatDock'

export default function TodoistTasksView({ token }: { token: string }) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days'>('today')
  const [tasks, setTasks] = useState<any[]>([])
  const [activeTask, setActiveTask] = useState<any | null>(null)

  const handleRefresh = (updated?: any[]) => updated && setTasks(updated)
  const openTaskChat = (task: any) => setActiveTask(task)
  const closeTaskChat = () => setActiveTask(null)

  return (
    <div className="flex h-full bg-gray-50 rounded-b-xl overflow-hidden">
      {/* 📋 Główna sekcja bez bocznego panelu */}
      <div className="flex-1 flex flex-col">
       

        {/* 🗒️ Lista zadań */}
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
          <div className="border-t bg-white p-3 sticky bottom-0">
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
