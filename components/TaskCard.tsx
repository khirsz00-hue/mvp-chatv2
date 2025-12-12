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

  const priorityColors = {
    1: 'border-l-4 border-l-gray-300',
    2: 'border-l-4 border-l-blue-400',
    3: 'border-l-4 border-l-yellow-400',
    4: 'border-l-4 border-l-red-500',
  }

  const priorityClass = priorityColors[task.priority as keyof typeof priorityColors] || ''

  return (
    <div className={`task-card-inner ${priorityClass} group`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 w-full min-w-0">
          {selectable && (
            <input 
              type="checkbox" 
              checked={selected} 
              onChange={(e) => onSelectChange?.(e.target.checked)} 
              className="mt-1.5 cursor-pointer" 
              onClick={(e) => e.stopPropagation()} 
            />
          )}

          <div className="min-w-0 grow cursor-pointer" onClick={() => onOpen?.(task)}>
            <div className="font-semibold text-gray-900 truncate mb-1" title={task.content}>
              {task.content}
            </div>
            {task.description ? (
              <div className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                {task.description}
              </div>
            ) : null}
            {task.project_name ? (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="font-medium">{task.project_name}</span>
              </div>
            ) : null}
          </div>
        </div>

        {!inlineActions && showContextMenu && (
          <button 
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" 
            onClick={(e) => { e.stopPropagation(); emit('openContextFor', { id: task.id }) }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {dueYmd ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg text-xs font-medium text-blue-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {dueYmd}
            </div>
          ) : null}
          {estLabel ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {estLabel}
            </div>
          ) : null}
        </div>

        {inlineActions ? (
          <div className="flex items-center gap-1.5">
            <button 
              className="task-action help px-3 py-1.5 text-xs" 
              onClick={(e) => { e.stopPropagation(); emit('taskHelp', { task }) }}
              title="Pomóż mi"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button 
              className="task-action complete px-3 py-1.5 text-xs" 
              onClick={(e) => { e.stopPropagation(); emit('taskComplete', { id: task.id }) }}
              title="Ukończ"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button 
              className="task-action postpone px-3 py-1.5 text-xs" 
              onClick={(e) => { e.stopPropagation(); emit('openMovePicker', { id: task.id, current: task._dueYmd }) }}
              title="Przenieś"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button 
              className="task-action delete px-3 py-1.5 text-xs" 
              onClick={(e) => { e.stopPropagation(); emit('taskDelete', { id: task.id }) }}
              title="Usuń"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
