'use client'

import React from 'react'
import ReactDOM from 'react-dom'
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
  inlineActions = false,
  selectable = false,
  selected = false,
  onSelectChange,
  onOpen,
}: {
  task: TaskType
  token?: string
  showContextMenu?: boolean
  inlineActions?: boolean
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (checked: boolean) => void
  onOpen?: (task: TaskType) => void
}) {
  const dueYmd = task._dueYmd ?? parseDueToLocalYMD(task.due)
  const estObj = getEstimate(task.id)
  const estLabel = estObj ? (estObj.minutes < 60 ? `${estObj.minutes}m` : `${Math.floor(estObj.minutes / 60)}h${estObj.minutes % 60 ? ` ${estObj.minutes % 60}m` : ''}`) : ''

  const emit = (name: string, detail?: any) => window.dispatchEvent(new CustomEvent(name, { detail }))

  return (
    <div className="p-3 bg-white rounded-lg border flex flex-col gap-3 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 w-full min-w-0">
          {selectable && (
            <input type="checkbox" checked={selected} onChange={(e) => onSelectChange?.(e.target.checked)} className="mt-1" onClick={(e) => e.stopPropagation()} />
          )}

          <div className="min-w-0 grow" onClick={() => onOpen?.(task)} style={{ cursor: 'pointer' }}>
            <div className="font-medium text-gray-800 truncate">{task.content}</div>
            {task.description ? <div className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</div> : null}
            {task.project_name ? <div className="text-xs text-gray-400 mt-1 truncate">{task.project_name}</div> : null}
          </div>
        </div>

        {/* Context menu for week view only (use portal), inline actions for list views */}
        {!inlineActions && showContextMenu && (
          <div className="relative">
            <button className="p-1 rounded hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); emit('openContextFor', { id: task.id }) }}>⋮</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-3">
          <span>{dueYmd ? `Due: ${dueYmd}` : ''}</span>
          {estLabel ? <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded">Est: {estLabel}</span> : null}
        </div>

        {inlineActions ? (
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded" onClick={(e) => { e.stopPropagation(); emit('taskHelp', { task }) }}>Pomóż mi</button>
            <button className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded" onClick={(e) => { e.stopPropagation(); emit('taskComplete', { id: task.id }) }}>Ukończ</button>
            <button className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded" onClick={(e) => { e.stopPropagation(); emit('openMovePicker', { id: task.id, current: task._dueYmd }) }}>Przenieś</button>
            <button className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded" onClick={(e) => { e.stopPropagation(); emit('taskDelete', { id: task.id }) }}>Usuń</button>
            <button className="px-2 py-1 text-xs bg-gray-100 rounded" onClick={(e) => { e.stopPropagation(); onOpen?.(task) }}>Szczegóły</button>
          </div>
        ) : (
          <div className="text-xs text-gray-400"> </div>
        )}
      </div>
    </div>
  )
}
