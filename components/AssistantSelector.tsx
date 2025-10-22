'use client'

import React from 'react'

export default function AssistantSelector({
  value,
  onChange,
  options = ['Default', 'GPT', 'Todoist AI'],
}: {
  value?: string
  onChange?: (v: string) => void
  options?: string[]
}) {
  return (
    <div className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2 shadow-sm">
      <div className="text-sm font-semibold text-gray-700">Asystent:</div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange?.(opt)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              value === opt ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
