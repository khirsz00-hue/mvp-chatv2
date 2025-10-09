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
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">{task.content}</p>
          {task.due && <span className="text-xs text-neutral-500">{task.due}</span>}
        </div>
        <div className="space-x-1 flex-shrink-0">
          <button className="text-green-600 text-xs font-medium" onClick={handleComplete}>Ukończ</button>
          <label className="text-blue-600 text-xs font-medium cursor-pointer">
            Przełóż
            <input type="date" className="hidden" onChange={e => handlePostpone(e.target.value)} />
          </label>
          <button className="text-red-500 text-xs font-medium" onClick={handleDelete}>Usuń</button>
          <button
            className="text-purple-600 text-xs font-medium"
            onClick={() => {
              setDialogMode('help')
              setShowDialog(true)
            }}
          >
            Pomóż mi
          </button>
        </div>
      </div>

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
