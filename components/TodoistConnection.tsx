'use client'

import { useState } from 'react'
import TodoistTasks from './TodoistTasks'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
}

export default function TodoistConnection({
  token,
  onDisconnect,
}: TodoistConnectionProps) {
  const [filter, setFilter] = useState('today')

  return (
    <div className="border border-green-200 rounded-xl p-4 bg-green-50">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-medium text-green-800">
          ✅ Połączono z Todoist
        </p>
        <button
          onClick={onDisconnect}
          className="text-sm px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700"
        >
          Odłącz
        </button>
      </div>

      {/* 🔹 Lista zadań Todoist */}
      <div className="border-t border-green-200 pt-3">
        <TodoistTasks
          token={token}
          filter={filter}
          onChangeFilter={setFilter}
        />
      </div>
    </div>
  )
}
