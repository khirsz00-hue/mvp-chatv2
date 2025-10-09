'use client'

import { useState } from 'react'
import TodoistTasks from './TodoistTasks'

export default function TodoistTasksView({ token }: { token: string }) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days'>('today')
  const [tasks, setTasks] = useState<any[]>([])

  const handleRefresh = (updated?: any[]) => updated && setTasks(updated)

  return (
    <div className="flex h-full bg-gray-50 rounded-b-xl overflow-hidden">
      {/* 📋 Główna sekcja */}
      <div className="flex-1 flex flex-col">
        {/* 🗒️ Lista zadań */}
        <div className="flex-1 overflow-y-auto p-3">
          <TodoistTasks
            token={token}
            filter={filter}
            onChangeFilter={setFilter}
            onUpdate={handleRefresh}
          />
        </div>
      </div>
    </div>
  )
}
