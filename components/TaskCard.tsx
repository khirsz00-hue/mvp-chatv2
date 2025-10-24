'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
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
  created_at?: string | number | null
  completed?: boolean
}

export default function TaskCard({
  task,
  token,
  showContextMenu = true,
  onAction,
  onHelp,
  selectable = false,
  selected = false,
  onSelectChange,
  onOpen,
  wrapTitle = false,
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
  wrapTitle?: boolean
}) {
  const [openMenu, setOpenMenu] = useState(false)
  const dueYmd = task._dueYmd ?? parseDueToLocalYMD(task.due)
  const estObj = getEstimate(task.id)
  const estLabel = estObj ? (estObj.minutes < 60 ? `${estObj.minutes}m` : `${Math.floor(estObj.minutes / 60)}h${estObj.minutes % 60 ? ` ${estObj.minutes % 60}m` : ''}`) : ''

  const handleComplete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      await fetch('/api/todoist/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, token }) })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error('complete error', err)
    }
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!confirm('Usunąć zadanie?')) return
    try {
      await fetch('/api/todoist/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, token }) })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error('delete error', err)
    }
  }

  const handleMove = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const newDate = prompt('Podaj nową datę (YYYY-MM-DD):')
    if (!newDate) return
    try {
      await fetch('/api/todoist/postpone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, token, newDate }) })
      window.dispatchEvent(new Event('taskUpdated'))
      onAction?.()
    } catch (err) {
      console.error('move error', err)
    }
  }

  const handleHelp = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const detail = { task: { id: task.id, title: task.content, description: task.description } }
    window.dispatchEvent(new CustomEvent('taskHelp', { detail }))
    onHelp?.(task)
    setOpenMenu(false)
  }

  return (
    <motion.div whileHover={{ scale: 1.01 }} className="p-3 bg-white rounded-lg border flex flex-col gap-3 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 w-full min-w-0">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectChange?.(e.target.checked)}
              className="mt-1"
              aria-label="Wybierz zadanie"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          <div className="min-w-0 grow" onClick={() => onOpen?.(task)} style={{ cursor: 'pointer' }}>
            <div className={`font-medium text-gray-800 ${wrapTitle ? 'whitespace-normal break-words' : 'truncate'}`}>{task.content}</div>
            {task.description ? <div className="text-xs text-gray-500 mt-1 line-clamp-2 break-words">{task.description}</div> : null}
            {task.project_name ? <div className="text-xs text-gray-400 mt-1 truncate">{task.project_name}</div> : null}
          </div>
        </div>

        {showContextMenu && (
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setOpenMenu((s) => !s) }} className="p-1 rounded hover:bg-gray-100" aria-label="menu">
              ⋮
            </button>
            {openMenu && (
              <div onClick={(e) => e.stopPropagation()} className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-50">
                <button onClick={(e) => { e.stopPropagation(); handleHelp(e) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Pomóż mi</button>
                <button onClick={(e) => { e.stopPropagation(); handleComplete(e) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Ukończ</button>
                <button onClick={(e) => { e.stopPropagation(); handleMove(e) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Przenieś</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(e) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-red-600">Usuń</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-3">
          <span>{dueYmd ? `Due: ${dueYmd}` : ''}</span>
          {typeof task.priority !== 'undefined' ? <span className="ml-2">• Priorytet: {task.priority}</span> : null}
          {estLabel ? <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded">Est: {estLabel}</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleHelp() }} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">Pomóż mi</button>
          <button onClick={(e) => { e.stopPropagation(); onOpen?.(task) }} className="px-2 py-1 text-xs bg-gray-100 rounded">Szczegóły</button>
        </div>
      </div>
    </motion.div>
  )
}
