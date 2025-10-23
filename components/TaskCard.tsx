'use client'

import React from 'react'
import { parseDueToLocalYMD, ymdFromDate } from '../utils/date'

export type TaskType = {
  id: string
  content: string
  description?: string
  _dueYmd?: string | null
  project_id?: string
  due?: any
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
      await fetch('/api/todoist/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, token }) })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Usunąć zadanie?')) return
    try {
      await fetch('/api/todoist/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, token }) })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error(err)
    }
  }

  const handlePostpone = async () => {
    const newDate = prompt('Przenieść na datę (YYYY-MM-DD):', '')
    if (!newDate) return
    try {
      await fetch('/api/todoist/postpone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, token, newDate }) })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error(err)
    }
  }

  const handleHelp = () => {
    // dispatch a taskHelp event which NewChatSidebar listens to (and will open ChatModal)
    const detail = { task: { id: task.id, title: task.content, description: task.description } }
    window.dispatchEvent(new CustomEvent('taskHelp', { detail }))
    // also ensure we don't create a duplicate TaskDialog - we do not dispatch taskSelect here
  }

  return (
    <div className="p-3 bg-white rounded-lg border flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-800">{task.content}</div>
          <div className="text-xs text-gray-500">{task.description || ''}</div>
        </div>
        {showContextMenu && (
          <div className="text-xs text-gray-400">
            {/* Example context menu placeholder — only shown in week view */}
            <button className="px-2 py-1">⋮</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{dueYmd ? `Due: ${dueYmd}` : ''}</div>

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
