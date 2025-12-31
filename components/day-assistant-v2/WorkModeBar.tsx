'use client'

import { useState } from 'react'
import { Lightning, Clock, Gear } from '@phosphor-icons/react'
import { WorkMode, MODE_ICONS, MODE_LABELS } from './WorkModeSelector'
import { WorkModeModal } from './WorkModeModal'

interface WorkModeBarProps {
  workMode: WorkMode
  workHoursStart: string
  workHoursEnd: string
  energy: number
  onWorkModeChange: (mode: WorkMode) => void
}

export function WorkModeBar({
  workMode,
  workHoursStart,
  workHoursEnd,
  energy,
  onWorkModeChange
}: WorkModeBarProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200 px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto text-sm">
          {/* Left: Mode */}
          <div className="flex items-center gap-3">
            <span className="text-lg">{MODE_ICONS[workMode]}</span>
            <span className="font-semibold text-gray-800">
              {MODE_LABELS[workMode]}
            </span>
          </div>

          {/* Center: Context */}
          <div className="hidden md:flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{workHoursStart}–{workHoursEnd}</span>
            </div>
            <div className="flex items-center gap-1">
              <Lightning size={16} weight="fill" />
              <span>{energy}/5</span>
            </div>
          </div>

          {/* Right: Change button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-purple-300 hover:bg-purple-50 transition-colors text-purple-700 font-medium"
          >
            <Gear size={16} />
            <span>Zmień</span>
          </button>
        </div>
      </div>

      {/* Modal with full descriptions */}
      <WorkModeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        currentMode={workMode}
        onSelect={(mode) => {
          onWorkModeChange(mode)
          setShowModal(false)
        }}
      />
    </>
  )
}
