'use client'

import React from 'react'
import { parseDueToLocalYMD } from '../utils/date'
import { getEstimate } from '../utils/localTaskStore'

export type TaskType = {
  id: string
  content: string
  description?: string
  due?: any
  project_id?: string
  _dueYmd?: string | null
  priority?: number
  project_name?: string
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
  onOpen,
}: {
  task: TaskType
  token?: string
  showContextMenu?: boolean
  onAction?: () => void
  onHelp?: (task: TaskType) => void
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (checked: boolean) => void
  onOpen?: (task: TaskType) => void
}) {
  const dueYmd = task._dueYmd ?? parseDueToLocalYMD(task.due)
  const estObj = getEstimate(task.id)
  const estLabel = estObj ? (estObj.minutes < 60 ? `${estObj.minutes}m` : `${Math.floor(estObj.minutes/60)}h${estObj.minutes%60 ? ` ${estObj.minutes%60}m` : ''}`) : ''

  const handleComplete = async () => {
    try {
      await fetch('/api/todoist/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, token }) })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error('complete error', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Usunąć zadanie?')) return
    try {
      await fetch('/api/todoist/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, token }) })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error('delete error', err)
    }
  }

  const handleHelp = () => {
    const detail = { task: { id: task.id, title: task.content, description: task.description } }
    window.dispatchEvent(new CustomEvent('taskHelp', { detail }))
    onHelp?.(task)
  }

  return (
    <div className="p-3 bg-white rounded-lg border flex flex-col gap-3 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 w-full min-w-0">
          {selectable && (
            <input type="checkbox" checked={selected} onChange={(e) => onSelectChange?.(e.target.checked)} className="mt-1" aria-label="Wybierz zadanie" />
          )}

          <div className="min-w-0 grow" onClick={() => onOpen?.(task)} style={{ cursor: 'pointer' }}>
            <div className="font-medium text-gray-800 truncate break-words">{task.content}</div>
            {task.description ? <div className="text-xs text-gray-500 mt-1 line-clamp-2 break-words">{task.description}</div> : null}
            {task.project_name ? <div className="text-xs text-gray-400 mt-1 truncate">{task.project_name}</div> : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-3">
          <span>{dueYmd ? `Due: ${dueYmd}` : ''}</span>
          {typeof task.priority !== 'undefined' ? <span className="ml-2">• Priorytet: {task.priority}</span> : null}
          {estLabel ? <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded">Est: {estLabel}</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleHelp} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">Pomóż mi</button>
          <button onClick={() => onOpen?.(task)} className="px-2 py-1 text-xs bg-gray-100 rounded">Szczegóły</button>
          <button onClick={handleComplete} className="px-2 py-1 text-xs bg-green-100 rounded">Ukończ</button>
          <button onClick={handleDelete} className="px-2 py-1 text-xs bg-red-100 rounded">Usuń</button>
        </div>
      </div>
    </div>
  )
}
