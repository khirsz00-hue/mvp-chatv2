'use client'

import React from 'react'

const assistantIcons: Record<string, string> = {
  'Todoist Helper': '✅',
  'AI Planner': '📅',
  '6 Hats': '🎩',
}

const assistantColors: Record<string, string> = {
  'Todoist Helper': 'from-success-500 to-success-600',
  'AI Planner': 'from-brand-500 to-brand-600',
  '6 Hats': 'from-accent-500 to-accent-600',
}

export default function AssistantSelector({
  value,
  onChange,
  options = ['Todoist Helper', 'AI Planner', '6 Hats'],
}: {
  value?: string
  onChange?: (v: string) => void
  options?: string[]
}) {
  return (
    <div className="inline-flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Wybierz asystenta</label>
      <div className="inline-flex items-center gap-2 p-1.5 bg-gray-100/80 backdrop-blur-sm rounded-2xl border border-gray-200/50">
        {options.map((opt) => {
          const isActive = value === opt
          const colorClass = assistantColors[opt] || 'from-gray-500 to-gray-600'
          return (
            <button
              key={opt}
              onClick={() => onChange?.(opt)}
              className={`
                relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                ${
                  isActive
                    ? `bg-gradient-to-r ${colorClass} text-white shadow-glow scale-105`
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-102 shadow-soft'
                }
              `}
              aria-pressed={isActive}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{assistantIcons[opt]}</span>
                <span className="whitespace-nowrap">{opt}</span>
              </div>
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" 
                     style={{ 
                       backgroundSize: '200% 100%',
                       backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                     }} 
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
