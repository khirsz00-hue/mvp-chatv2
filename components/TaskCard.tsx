'use client'

import { useEffect, useState } from 'react'
import TaskDialog from './TaskDialog'

interface Task {
  id: string
  content: string
  due?: string
  priority?: number
  project_id?: string
}

interface TaskCardProps {
  task: Task
  token: string
  onAction: (action: 'completed' | 'deleted' | 'postponed') => void
}

export default function TaskCard({ task, token, onAction }: TaskCardProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState<'none' | 'help'>('none')
  const [summary, setSummary] = useState<string | null>(null)

  // 📦 zapisz nazwę taska (dla historii czatów)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`task_title_${task.id}`, task.content)
    }
  }, [task.id, task.content])

  // 🔁 wczytywanie lokalnej syntezy (AI summary)
  const loadSummary = () => {
    const saved = localStorage.getItem(`summary_${task.id}`)
    setSummary(saved || null)
  }

  useEffect(() => {
    loadSummary()
    // nasłuchuj eventu "taskUpdated" aby automatycznie odświeżać tooltip po nowej syntezie
    const handler = () => loadSummary()
    window.addEventListener('taskUpdated', handler)
    return () => window.removeEventListener('taskUpdated', handler)
  }, [])

  const handleComplete = async () => {
    await fetch('/api/todoist/complete', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token }),
    })
    onAction('completed')
  }

  const handleDelete = async () => {
    await fetch('/api/todoist/delete', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token }),
    })
    onAction('deleted')
  }

  const handlePostpone = async (newDate: string) => {
    await fetch('/api/todoist/postpone', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token, newDate }),
    })
    onAction('postponed')
  }

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition relative group">
      {/* Główna treść */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-medium text-gray-800 leading-snug">{task.content}</p>
          {task.due && (
            <span className="text-xs text-gray-500">{task.due}</span>
          )}
        </div>

        {/* 💡 Ikona syntezy */}
        {summary && (
          <div className="ml-2 relative group/summary">
            <span className="text-yellow-500 text-lg cursor-pointer select-none">💡</span>
            <div className="absolute right-0 top-6 z-20 hidden group-hover/summary:block bg-white border border-gray-200 text-gray-700 text-xs rounded-md p-3 w-64 shadow-xl">
              <p className="font-semibold text-gray-800">🧠 Wnioski AI:</p>
              <p className="mt-1 text-gray-600 whitespace-pre-line leading-snug">{summary}</p>
            </div>
          </div>
        )}
      </div>

      {/* 🔹 Przyciski akcji */}
      <div className="flex justify-end gap-2 mt-2 flex-wrap">
        <button
          onClick={handleComplete}
          className="px-2 py-1 text-xs rounded-lg bg-green-100 hover:bg-green-200 text-green-700"
        >
          ✅ Ukończ
        </button>

        <label className="relative px-2 py-1 text-xs rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 cursor-pointer">
          📅 Przełóż
          <input
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => handlePostpone(e.target.value)}
          />
        </label>

        <button
          onClick={handleDelete}
          className="px-2 py-1 text-xs rounded-lg bg-red-100 hover:bg-red-200 text-red-700"
        >
          🗑️ Usuń
        </button>

        <button
          onClick={() => {
            setDialogMode('help')
            setShowDialog(true)
          }}
          className="px-2 py-1 text-xs rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700"
        >
          💬 Pomóż mi
        </button>
      </div>

      {/* Popup czatu */}
      {showDialog && (
        <TaskDialog
          task={task}
          mode={dialogMode}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  )
}
