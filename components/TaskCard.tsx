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
  priority?: number
  project_name?: string
  // possible fields for estimated time — support multiple keys
  estimated_time?: string | number
  estimate?: string | number
  time_estimate?: string | number
  estimated?: string | number
}

export default function TaskCard({
  task,
  token,
  showContextMenu = false,
  onAction,
  onHelp,
  selectable = false,
  selected = false,
  onSelectChange,
}: {
  task: TaskType
  token?: string
  showContextMenu?: boolean
  onAction?: () => void
  onHelp?: (task: TaskType) => void
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (checked: boolean) => void
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

  const handleSelectToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectChange?.(e.target.checked)
  }

  const estimated = task.estimated_time ?? task.estimate ?? task.time_estimate ?? task.estimated

  return (
    <div className="p-3 bg-white rounded-lg border flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 w-full min-w-0">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={handleSelectToggle}
              className="mt-1"
              aria-label="Wybierz zadanie"
            />
          )}

          <div className="min-w-0 grow">
            <div className="font-medium text-gray-800 truncate">{task.content}</div>
            {task.description ? <div className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</div> : null}
            {task.project_name ? <div className="text-xs text-gray-400 mt-1">{task.project_name}</div> : null}
          </div>
        </div>

        {showContextMenu && (
          <div className="text-xs text-gray-400 ml-2">
            <button className="px-2 py-1">⋮</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-3">
          <span>{dueYmd ? `Due: ${dueYmd}` : ''}</span>
          {typeof task.priority !== 'undefined' ? <span className="ml-2">• Priorytet: {task.priority}</span> : null}
          {estimated ? <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded">Est: {estimated}</span> : null}
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
