'use client'

import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
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
  const [menuContainer, setMenuContainer] = useState<HTMLElement | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRef = React.useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMenuContainer(document.body)
  }, [])

  useEffect(() => {
    if (!openMenu) return
    const handleClickOutside = () => setOpenMenu(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openMenu])

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!openMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect()
      setMenuPosition({ top: rect.bottom + 4, left: rect.right - 176 }) // 176 = menu width
    }
    setOpenMenu((s) => !s)
  }

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

  // Menu rendered in portal to avoid overflow clipping
  const Menu = (
    <div className="w-44 bg-white border rounded-md shadow-lg z-50">
      <button onClick={(e) => { e.stopPropagation(); handleHelp(e) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Pomóż mi</button>
      <button onClick={(e) => { e.stopPropagation(); handleComplete(e) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Ukończ</button>
      <button onClick={(e) => { e.stopPropagation(); handleMove(e) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Przenieś</button>
      <button onClick={(e) => { e.stopPropagation(); handleDelete(e) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-red-600">Usuń</button>
    </div>
  )

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
            <button ref={menuButtonRef} onClick={handleMenuToggle} className="p-1 rounded hover:bg-gray-100" aria-label="menu">
              ⋮
            </button>
            {openMenu && menuContainer && menuPosition && ReactDOM.createPortal(
              <div className="fixed" style={{ top: menuPosition.top, left: menuPosition.left }} onClick={(e) => e.stopPropagation()}>
                {Menu}
              </div>,
              menuContainer
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

        {!showContextMenu && (
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleHelp() }} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Pomóż mi</button>
            <button onClick={(e) => { e.stopPropagation(); handleComplete(e) }} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">Ukończ</button>
            <button onClick={(e) => { e.stopPropagation(); handleMove(e) }} className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">Przenieś</button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(e) }} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Usuń</button>
            <button onClick={(e) => { e.stopPropagation(); onOpen?.(task) }} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">Szczegóły</button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
