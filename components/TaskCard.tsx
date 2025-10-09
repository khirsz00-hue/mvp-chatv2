'use client'
import { useState } from 'react'
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
   <div className="border rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition">
  <div className="flex justify-between items-center mb-2">
    <div>
      <p className="font-medium">{task.content}</p>
      {task.due && <span className="text-xs text-neutral-500">{task.due}</span>}
    </div>
  </div>

  <div className="flex justify-end gap-2 mt-2">
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

  {showDialog && (
    <TaskDialog task={task} mode={dialogMode} onClose={() => setShowDialog(false)} />
  )}
</div>
  )
}
