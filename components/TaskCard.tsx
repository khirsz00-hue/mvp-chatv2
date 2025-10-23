'use client'

import React from 'react'
import { parseDueToLocalYMD } from '../utils/date'

export type TaskType = {
  id: string
  content: string
  description?: string
  due?: any
  project_id?: string
  _dueYmd?: string | null
  priority?: number // added to match places that pass priority
  project_name?: string
}

export default function TaskCard({
  task,
  token,
  showContextMenu = false,
  onAction,
  onHelp,
}: {
  task: TaskType
  token?: string
  showContextMenu?: boolean
  onAction?: () => void
  onHelp?: (task: TaskType) => void
}) {
  const dueYmd = task._dueYmd ?? parseDueToLocalYMD(task.due)

  const handleComplete = async () => {
    try {
      await fetch('/api/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, token }),
      })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error('complete error', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Usunąć zadanie?')) return
    try {
      await fetch('/api/todoist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, token }),
      })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error('delete error', err)
    }
  }

  const handlePostpone = async () => {
    const newDate = prompt('Przenieść na datę (YYYY-MM-DD):', '')
    if (!newDate) return
    try {
      await fetch('/api/todoist/postpone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, token, newDate }),
      })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error('postpone error', err)
    }
  }

  const handleHelp = () => {
    const detail = { task: { id: task.id, title: task.content, description: task.description } }
    window.dispatchEvent(new CustomEvent('taskHelp', { detail }))
    onHelp?.(task)
  }

  return (
    <div className="p-3 bg-white rounded-lg border flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-800">{task.content}</div>
          {task.description ? <div className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</div> : null}
          {task.project_name ? <div className="text-xs text-gray-400 mt-1">{task.project_name}</div> : null}
        </div>
        {showContextMenu && (
          <div className="text-xs text-gray-400">
            <button className="px-2 py-1">⋮</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {dueYmd ? `Due: ${dueYmd}` : ''}
          {typeof task.priority !== 'undefined' ? <span className="ml-2">• Priorytet: {task.priority}</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePostpone} className="px-2 py-1 text-xs bg-gray-100 rounded">Przenieś</button>
          <button onClick={handleComplete} className="px-2 py-1 text-xs bg-green-100 rounded">Ukończ</button>
          <button onClick={handleDelete} className="px-2 py-1 text-xs bg-red-100 rounded">Usuń</button>
          <button onClick={handleHelp} className="px-2 py-1 text-xs bg-violet-600 text-white rounded">Pomóż mi</button>
        </div>
      </div>
    </div>
  )
}
