'use client'

import { Play, Clock, Calendar, Brain } from '@phosphor-icons/react'

export interface TaskCardProps {
  id: string
  title: string
  description?: string
  estimate?: string // e.g., "30min"
  priority?: string // "P1", "P2", "P3", "P4"
  cognitive_load?: number // 1-5
  due_date?: string
  overdue?: boolean
  context_type?: string
  postpone_count?: number
}

/**
 * Beautiful visual card for displaying tasks in chat
 * Optimized for ADHD users with clear visual hierarchy
 */
export function TaskCard({
  id,
  title,
  description,
  estimate,
  priority = 'P4',
  cognitive_load,
  due_date,
  overdue = false,
  context_type,
  postpone_count
}: TaskCardProps) {
  const priorityConfig = {
    P1: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    P2: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    P3: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    P4: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
  }

  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.P4

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(date)
    taskDate.setHours(0, 0, 0, 0)

    if (taskDate.getTime() === today.getTime()) return 'Dziś'
    if (taskDate.getTime() === today.getTime() + 86400000) return 'Jutro'
    if (taskDate < today) return 'Przeterminowane'
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
  }

  // Cognitive load visualization (brain emoji count)
  const renderCognitiveLoad = () => {
    if (!cognitive_load) return null
    const brainCount = Math.min(cognitive_load, 5)
    return (
      <span className="flex items-center gap-0.5 text-gray-600" title={`Cognitive load: ${cognitive_load}/5`}>
        {Array.from({ length: brainCount }).map((_, i) => (
          <Brain key={i} size={12} weight="fill" />
        ))}
      </span>
    )
  }

  return (
    <div 
      className={`bg-white border-2 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer mt-2
        ${overdue ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-cyan-400'}`}
      onClick={() => {
        // Navigate to task or start timer
        window.location.href = `/day-assistant-v2?task=${id}`
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <span className={`${config.bg} ${config.text} ${config.border} border px-2 py-0.5 rounded text-xs font-bold`}>
            {priority}
          </span>
          {overdue && (
            <span className="bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded text-xs font-bold">
              Przeterminowane
            </span>
          )}
          {postpone_count && postpone_count > 0 && (
            <span className="bg-yellow-100 text-yellow-700 border border-yellow-300 px-1.5 py-0.5 rounded text-xs">
              {postpone_count}x odłożone
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            window.location.href = `/day-assistant-v2?task=${id}&autostart=true`
          }}
          className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-xs 
                     hover:scale-105 transition flex items-center gap-1 flex-shrink-0 ml-2"
        >
          <Play size={12} weight="fill" />
          Zacznij
        </button>
      </div>

      <h3 className="font-semibold text-gray-900 text-sm mb-2">{title}</h3>

      <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
        {estimate && (
          <span className="flex items-center gap-1">
            <Clock size={14} weight="bold" />
            {estimate}
          </span>
        )}
        {due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
            <Calendar size={14} weight="bold" />
            {formatDate(due_date)}
          </span>
        )}
        {cognitive_load !== undefined && renderCognitiveLoad()}
        {context_type && (
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
            {context_type}
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{description}</p>
      )}
    </div>
  )
}
