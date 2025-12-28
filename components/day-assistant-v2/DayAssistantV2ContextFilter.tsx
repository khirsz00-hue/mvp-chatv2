/**
 * DayAssistantV2ContextFilter - Dropdown for filtering tasks by context
 * Part of Day Assistant V2 Complete Overhaul
 */

'use client'

import React from 'react'
import Select from '@/components/ui/Select'

interface DayAssistantV2ContextFilterProps {
  contexts: string[]
  selected: string | null
  onChange: (context: string | null) => void
}

export function DayAssistantV2ContextFilter({ contexts, selected, onChange }: DayAssistantV2ContextFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">📁 Filtr kontekstu:</label>
      
      <Select
        value={selected || 'all'}
        onChange={(e) => onChange(e.target.value === 'all' ? null : e.target.value)}
        className="w-full md:w-64"
      >
        <option value="all">Wszystkie konteksty</option>
        
        {contexts.map((context) => (
          <option key={context} value={context}>
            📁 {context}
          </option>
        ))}
      </Select>
    </div>
  )
}
