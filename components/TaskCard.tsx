'use client'

import React, { useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, Clock, Calendar, MoreVertical } from 'lucide-react'

export type TaskType = {
  id: string
  content: string
  project_id?: string
  project_name?: string
  due?: string | { date?: string } | null
  priority?: number
  labels?: string[]
  estimated?: string
  description?: string
}

export default function TaskCard({
  task,
  token,
  onAction,
  selectable = false,
  selected = false,
  onSelectChange,
}: {
  task: TaskType
  token?: string | null
  onAction?: () => void
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (checked: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [helping, setHelping] = useState(false)
  const dateRef = useRef<HTMLInputElement | null>(null)

  const dueStr =
    typeof task.due === 'string' ? task.due : (task.due && (task.due as any).date) || null

  const dueDate = dueStr ? safeParseDate(dueStr) : null
  const dueLabel = dueDate ? readableDue(dueDate) : 'Brak terminu'

  function safeParseDate(d: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T12:00:00')
    try {
      const p = parseISO(d)
      if (!isNaN(p.getTime())) return p
      return new Date(d)
    } catch {
      return new Date(d)
    }
  }

  function readableDue(d: Date) {
    try {
      return `${format(d, 'dd LLL yyyy')}`
    } catch {
      return d.toLocaleDateString()
    }
  }

  const priorityLabel = (p?: number) => {
    if (!p) return null
    if (p === 4) return { text: 'Wysoki', color: 'bg-red-100 text-red-700' }
    if (p === 3) return { text: 'Średni', color: 'bg-yellow-100 text-yellow-700' }
    return { text: 'Niski', color: 'bg-green-100 text-green-700' }
  }

  const pr = priorityLabel(task.priority)

  const handleHelp = () => {
    setHelping(true)
    try {
      const detail = { mode: 'todoist', task: { id: task.id, title: task.content, description: task.description } }
      // dispatch dedicated event only for tasks — does not interfere with generic chatSelect used by history
      window.dispatchEvent(new CustomEvent('taskHelp', { detail }))
      // also alias 'taskSelect' for direct open semantics
      window.dispatchEvent(new CustomEvent('taskSelect', { detail }))
    } catch (err) {
      console.error('help dispatch failed', err)
    } finally {
      setHelping(false)
    }
  }

  // reszta funkcji (complete/postpone/delete) bez zmian — zostawiam je tak jak były
  const handleComplete = async () => { /* ... */ }
  const handleDelete = async () => { /* ... */ }
  const handlePostponePick = () => { /* ... */ }
  const handlePostpone = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectChange?.(e.target.checked)}
              className="w-4 h-4"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 truncate">{task.content}</h3>
              {pr && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.color} ml-2`}>
                  {pr.text}
                </span>
              )}
            </div>
            {task.project_name && (
              <div className="text-xs text-gray-500 mt-1 truncate">{task.project_name}</div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <button
            title="Szczegóły"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('taskSelect', { detail: { mode: 'todoist', task: { id: task.id, title: task.content, description: task.description } } }))
            }
            className="p-1 rounded hover:bg-gray-50"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Calendar size={14} /> {dueLabel}
          </span>
          {task.estimated && (
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {task.estimated}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={handlePostponePick} className="task-action postpone" title="Przenieś" disabled={loading}>
          Przenieś
        </button>

        <button onClick={handleComplete} className="task-action complete" title="Ukończ" disabled={loading}>
          Ukończ
        </button>

        <button onClick={handleDelete} className="task-action delete" title="Usuń" disabled={loading}>
          Usuń
        </button>

        <div className="ml-auto">
          <button onClick={handleHelp} className="task-action help" title="Pomóż mi" disabled={helping}>
            Pomóż mi
          </button>
        </div>
      </div>

      <input ref={dateRef} type="date" className="hidden" onChange={handlePostpone} />
    </div>
  )
}
