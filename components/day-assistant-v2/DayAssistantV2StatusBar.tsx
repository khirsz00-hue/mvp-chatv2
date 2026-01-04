/**
 * DayAssistantV2StatusBar Component
 * Light status bar that appears when no timer is active
 * Shows working hours, work mode, and capacity/overload information
 */

'use client'

import { Clock, Lightning, Warning } from '@phosphor-icons/react'

export interface StatusBarProps {
  workHoursStart: string
  workHoursEnd: string
  workMode: string
  usedMinutes: number
  totalCapacity: number
  onWorkModeClick?: () => void
}

export function DayAssistantV2StatusBar({
  workHoursStart,
  workHoursEnd,
  workMode,
  usedMinutes,
  totalCapacity,
  onWorkModeClick
}: StatusBarProps) {
  const remainingMinutes = totalCapacity - usedMinutes
  const overloadPercent = Math.round((usedMinutes / totalCapacity) * 100)
  const isOverloaded = overloadPercent > 80

  const modeLabels: Record<string, string> = {
    low_focus: 'Low Focus',
    standard: 'Standard',
    hyperfocus: 'Focus',
    quick_wins: 'Quick Wins'
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-8">
          
          {/* Working Hours */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide mb-1">
              <Clock size={14} />
              <span>Working Hours</span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {workHoursStart} - {workHoursEnd}
            </div>
          </div>

          {/* Mode */}
          <div className="flex flex-col cursor-pointer" onClick={onWorkModeClick}>
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide mb-1">
              <Lightning size={14} weight="fill" />
              <span>Mode</span>
            </div>
            <div className="text-sm font-semibold text-purple-600">
              {modeLabels[workMode] || workMode}
            </div>
          </div>

          {/* Day Overload Warning */}
          {isOverloaded && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs text-orange-600 uppercase tracking-wide mb-1">
                <Warning size={14} weight="fill" />
                <span>Day Overload</span>
              </div>
              <div className="text-sm font-bold text-orange-600">
                {overloadPercent}%
              </div>
            </div>
          )}

          {/* Capacity Display */}
          <div className="flex flex-col items-end">
            <div className={`text-sm font-medium ${isOverloaded ? 'text-orange-600' : 'text-gray-900'}`}>
              {usedMinutes} / {totalCapacity} min
            </div>
            {remainingMinutes > 0 ? (
              <div className="text-xs text-gray-500">
                {remainingMinutes} min remaining
              </div>
            ) : (
              <div className="text-xs text-red-600 font-medium">
                Over by {Math.abs(remainingMinutes)} min
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
