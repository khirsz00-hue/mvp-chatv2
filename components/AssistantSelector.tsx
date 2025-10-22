'use client'

import React from 'react'

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
    <div className="w-full bg-white px-4 py-3 border-b border-gray-200">
      <div className="max-w-full mx-auto">
        <label className="block text-xs font-semibold text-gray-600 mb-2">Wybierz asystenta</label>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange?.(opt)}
              className={`px-3 py-2 rounded-full text-sm transition focus:outline-none ${
                value === opt
                  ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
