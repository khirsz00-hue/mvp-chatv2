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
    <div className="w-full bg-white px-3 py-2 border-b border-gray-200">
      <div className="max-w-full mx-auto flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-700 mr-2">Wybierz asystenta</div>
        <div className="flex gap-2 flex-wrap">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange?.(opt)}
              className={`px-3 py-1.5 rounded-full text-sm transition focus:outline-none ${
                value === opt
                  ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-md'
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
