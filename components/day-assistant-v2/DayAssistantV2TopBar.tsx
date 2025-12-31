/**
 * DayAssistantV2TopBar Component
 * Clean, minimal status bar with inline editable work hours
 * Replaces the old TopStatusBar when no timer is active
 */

'use client'

import { WorkMode } from './WorkModeSelector'
import { Clock, Lightning, ChartBar } from '@phosphor-icons/react'

export interface DayAssistantV2TopBarProps {
  selectedDate: string
  workHoursStart: string
  workHoursEnd: string
  capacityMinutes: number
  workMode: WorkMode
  completedMinutes: number
  onWorkHoursChange: (start: string, end: string) => void
  onWorkModeChange: (mode: WorkMode) => void
  meetingMinutes?: number
  originalCapacityMinutes?: number
}

const WORK_MODE_OPTIONS = {
  low_focus: '🔴 Low Focus',
  standard: '🟡 Standard',
  hyperfocus: '⚡ HyperFocus',
  quick_wins: '⏱️ Quick Wins'
}

export function DayAssistantV2TopBar({
  selectedDate,
  workHoursStart,
  workHoursEnd,
  capacityMinutes,
  workMode,
  completedMinutes,
  onWorkHoursChange,
  onWorkModeChange,
  meetingMinutes,
  originalCapacityMinutes
}: DayAssistantV2TopBarProps) {
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekday = date.toLocaleDateString('pl-PL', { weekday: 'long' })
    const day = date.getDate()
    const month = date.toLocaleDateString('pl-PL', { month: 'long' })
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} ${month}`
  }

  const capacityHours = Math.floor(capacityMinutes / 60)
  const originalHours = originalCapacityMinutes ? Math.floor(originalCapacityMinutes / 60) : capacityHours
  const meetingHours = meetingMinutes ? (meetingMinutes / 60).toFixed(1) : null
  
  const progressPercent = capacityMinutes > 0 
    ? Math.round((completedMinutes / capacityMinutes) * 100) 
    : 0

  return (
    <div className="sticky top-0 z-50 w-full bg-white border-b shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4">
        
        {/* Line 1: Date */}
        <div className="text-sm font-semibold text-gray-900 mb-3">
          📅 {formatDate(selectedDate)}
        </div>

        {/* Line 2: Work hours + Mode + Progress */}
        <div className="flex items-center gap-6 flex-wrap">
          
          {/* Editable work hours */}
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-purple-600" />
            <input 
              type="time" 
              value={workHoursStart}
              onChange={(e) => {
                onWorkHoursChange(e.target.value, workHoursEnd)
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm font-medium hover:border-purple-500 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-colors"
            />
            <span className="text-gray-400">→</span>
            <input 
              type="time" 
              value={workHoursEnd}
              onChange={(e) => {
                onWorkHoursChange(workHoursStart, e.target.value)
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm font-medium hover:border-purple-500 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-colors"
            />
            <span className="text-gray-600 text-sm">
              • {capacityHours}h
              {meetingMinutes && meetingMinutes > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  ({originalHours}h praca - {meetingHours}h spotkania + bufory)
                </span>
              )}
            </span>
          </div>

          {/* Work Mode Dropdown */}
          <div className="flex items-center gap-2">
            <Lightning size={18} className="text-purple-600" weight="fill" />
            <select 
              value={workMode}
              onChange={(e) => onWorkModeChange(e.target.value as WorkMode)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium bg-white hover:border-purple-500 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none cursor-pointer transition-colors"
            >
              {Object.entries(WORK_MODE_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 text-sm text-gray-600" aria-label="Postęp dnia pracy">
            <ChartBar size={18} className="text-purple-600" aria-hidden="true" />
            <span>
              Progress: <strong className="text-gray-900">{completedMinutes}/{capacityMinutes} min</strong> 
              <span className="text-gray-500 ml-1">({progressPercent}%)</span>
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
