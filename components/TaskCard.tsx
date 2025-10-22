'use client'

import React, { useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, Clock, Calendar, MoreVertical } from 'lucide-react'

type Task = {
  id: string
  content: string
  project_id?: string
  project_name?: string
  due?: string | { date: string } | null
  priority?: number
  labels?: string[]
  // optional fields sometimes present in other places
  estimated?: string
}

export default function TaskCard({
  task,
  token,
  onAction,
  selectable = false,
  selected = false,
  onSelectChange,
}: {
  task: Task
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
      return `🗓 ${format(d, 'dd LLL yyyy')}`
    } catch {
      return d.toLocaleDateString()
    }
  }

  const priorityLabel = (p?: number) => {
    if (!p) return null
    if (p === 4) return { text: 'High', color: 'bg-red-100 text-red-700' }
    if (p === 3) return { text: 'Medium', color: 'bg-yellow-100 text-yellow-700' }
    return { text: 'Low', color: 'bg-green-100 text-green-700' }
  }

  const pr = priorityLabel(task.priority)

  const handleComplete = async () => {
    if (!token) return alert('Brak tokena Todoist')
    setLoading(true)
    try {
      await fetch('/api/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, token }),
      })
      onAction?.()
    } catch (err) {
      console.error('complete error', err)
      alert('Błąd przy ukończeniu')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!token) return alert('Brak tokena Todoist')
    if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) return
    setLoading(true)
    try {
      await fetch('/api/todoist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, token }),
      })
      onAction?.()
    } catch (err) {
      console.error('delete error', err)
      alert('Błąd przy usuwaniu')
    } finally {
      setLoading(false)
    }
  }

  const handlePostponePick = () => {
    const el = dateRef.current
    ;(el as any)?.showPicker?.() || el?.click?.()
  }

  const handlePostpone = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (!v || !token) return
    setLoading(true)
    try {
      await fetch('/api/todoist/postpone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, token, newDate: v }),
      })
      onAction?.()
    } catch (err) {
      console.error('postpone error', err)
      alert('Błąd przy przenoszeniu')
    } finally {
      setLoading(false)
    }
  }

  const handleHelp = () => {
    // Dispatch global event in the same shape other parts of app expect
    setHelping(true)
    try {
      window.dispatchEvent(
        new CustomEvent('chatSelect', {
          detail: {
            mode: 'todoist',
            task: { id: task.id, title: task.content },
          },
        })
      )
    } catch (err) {
      console.error('help dispatch failed', err)
    } finally {
      setHelping(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
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
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.color} ml-2`}
                >
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
              window.dispatchEvent(
                new CustomEvent('chatSelect', { detail: { mode: 'todoist', task: { id: task.id, title: task.content } } })
              )
            }
            className="p-1 rounded hover:bg-gray-50"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* meta */}
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

        <div className="flex items-center gap-2">
          {/* optional small status */}
        </div>
      </div>

      {/* actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handlePostponePick}
          className="task-action postpone"
          title="Przenieś"
          disabled={loading}
        >
          Przenieś
        </button>

        <button
          onClick={handleComplete}
          className="task-action complete"
          title="Ukończ"
          disabled={loading}
        >
          Ukończ
        </button>

        <button
          onClick={handleDelete}
          className="task-action delete"
          title="Usuń"
          disabled={loading}
        >
          Usuń
        </button>

        <div className="ml-auto">
          <button
            onClick={handleHelp}
            className="task-action help"
            title="Pomóż mi"
            disabled={helping}
          >
            Pomóż mi
          </button>
        </div>
      </div>

      {/* hidden date input */}
      <input
        ref={dateRef}
        type="date"
        className="hidden"
        onChange={handlePostpone}
      />
    </div>
  )
}

// small CSS utilities (if tailwind classes from globals.css are present these helpers map to them)
// but component uses class names defined in globals.css provided previously.
