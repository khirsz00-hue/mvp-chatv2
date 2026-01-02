'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { WorkModeModal } from './WorkModeModal'
import { WorkMode, MODE_ICONS, MODE_LABELS } from './WorkModeSelector'

interface DayAssistantV2UnifiedTopBarProps {
  selectedDate: string
  workMode: WorkMode
  workHoursStart: string
  workHoursEnd: string
  capacityMinutes: number
  usedMinutes: number
  usagePercentage: number
  remainingTasks: number
  onWorkModeChange: (mode: WorkMode) => void
}

export function DayAssistantV2UnifiedTopBar({
  selectedDate,
  workMode,
  workHoursStart,
  workHoursEnd,
  capacityMinutes,
  usedMinutes,
  usagePercentage,
  remainingTasks,
  onWorkModeChange
}: DayAssistantV2UnifiedTopBarProps) {
  const [showWorkModeModal, setShowWorkModeModal] = useState(false)

  // Format date
  const formattedDate = new Date(selectedDate).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Capitalize first letter
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  // Polish pluralization for tasks
  const getTasksText = (count: number) => {
    if (count === 1) return '1 zadanie pozostało'
    if (count >= 2 && count <= 4) return `${count} zadania pozostały`
    return `${count} zadań pozostało`
  }

  return (
    <>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* First row: Date, Work Mode, Hours */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
            {/* Date */}
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <span className="font-semibold text-gray-900">{capitalizedDate}</span>
            </div>

            {/* Work Mode + Hours container for mobile/desktop */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Work Mode (clickable) */}
              <button
                onClick={() => setShowWorkModeModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
              >
                <span className="text-lg">{MODE_ICONS[workMode]}</span>
                <span className="font-medium text-purple-900">{MODE_LABELS[workMode]}</span>
                <CaretDown size={16} className="text-purple-700" />
              </button>

              {/* Work Hours */}
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-lg">⏰</span>
                <span className="font-medium">{workHoursStart}–{workHoursEnd}</span>
              </div>
            </div>
          </div>

          {/* Second row: Progress bar + stats */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Progress bar */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-600">
                  {usedMinutes}/{capacityMinutes} min ({usagePercentage}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    usagePercentage >= 100
                      ? 'bg-red-500'
                      : usagePercentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Remaining tasks badge */}
            <div className="px-3 py-1 bg-gray-100 rounded-full whitespace-nowrap">
              <span className="text-sm font-medium text-gray-700">
                {getTasksText(remainingTasks)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Work Mode Modal */}
      <WorkModeModal
        isOpen={showWorkModeModal}
        onClose={() => setShowWorkModeModal(false)}
        currentMode={workMode}
        onSelect={(mode) => {
          onWorkModeChange(mode)
          setShowWorkModeModal(false)
        }}
      />
    </>
  )
}
