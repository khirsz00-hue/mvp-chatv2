'use client'

import { useState } from 'react'
import { Clock, Gear } from '@phosphor-icons/react'
import { WorkMode, MODE_ICONS, MODE_LABELS } from './WorkModeSelector'
import { WorkModeModal } from './WorkModeModal'

interface WorkModeBarProps {
  workMode: WorkMode
  workHoursStart: string
  workHoursEnd: string
  onWorkModeChange: (mode: WorkMode) => void
  onWorkHoursChange?: (start: string, end: string) => void
  usedMinutes: number
  totalCapacity: number
  meetingMinutes?: number
}

export function WorkModeBar({
  workMode,
  workHoursStart,
  workHoursEnd,
  onWorkModeChange,
  onWorkHoursChange,
  usedMinutes,
  totalCapacity,
  meetingMinutes
}: WorkModeBarProps) {
  const [showModal, setShowModal] = useState(false)
  const [isEditingStartTime, setIsEditingStartTime] = useState(false)
  const [isEditingEndTime, setIsEditingEndTime] = useState(false)

  const capacityPercentage = totalCapacity > 0 
    ? Math.min(Math.round((usedMinutes / totalCapacity) * 100), 100)
    : 0

  return (
    <>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 border-b-2 border-purple-300 px-6 py-3 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          
          {/* Left: Mode & Hours */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <span className="text-2xl">{MODE_ICONS[workMode]}</span>
              <span className="font-bold text-white text-lg">
                {MODE_LABELS[workMode]}
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-3 text-white">
              {/* Editable work hours */}
              <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1 hover:bg-white/20 transition-colors">
                <Clock size={18} />
                {isEditingStartTime ? (
                  <input 
                    type="time" 
                    value={workHoursStart}
                    onChange={(e) => onWorkHoursChange?.(e.target.value, workHoursEnd)}
                    onBlur={() => setIsEditingStartTime(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditingStartTime(false)
                      }
                    }}
                    className="w-20 bg-white text-gray-900 rounded px-1 text-sm"
                    aria-label="Godzina rozpoczęcia pracy"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="cursor-pointer hover:underline"
                    onClick={() => setIsEditingStartTime(true)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Godzina rozpoczęcia: ${workHoursStart}. Kliknij aby edytować`}
                  >
                    {workHoursStart}
                  </span>
                )}
                <span>–</span>
                {isEditingEndTime ? (
                  <input 
                    type="time" 
                    value={workHoursEnd}
                    onChange={(e) => onWorkHoursChange?.(workHoursStart, e.target.value)}
                    onBlur={() => setIsEditingEndTime(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditingEndTime(false)
                      }
                    }}
                    className="w-20 bg-white text-gray-900 rounded px-1 text-sm"
                    aria-label="Godzina zakończenia pracy"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="cursor-pointer hover:underline"
                    onClick={() => setIsEditingEndTime(true)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Godzina zakończenia: ${workHoursEnd}. Kliknij aby edytować`}
                  >
                    {workHoursEnd}
                  </span>
                )}
              </div>
              
              {/* Capacity bar */}
              <div className="flex items-center gap-2 bg-white/10 rounded px-3 py-1">
                <span className="text-sm">
                  {usedMinutes}/{totalCapacity} min
                </span>
                <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-400 transition-all"
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-semibold">
                  {capacityPercentage}%
                </span>
              </div>

              {/* Meetings info */}
              {meetingMinutes && meetingMinutes > 0 && (
                <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1 text-sm">
                  📅 <span>{meetingMinutes} min spotkań</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right: Change button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white font-semibold border border-white/30 shadow-md"
          >
            <Gear size={18} weight="bold" />
            <span>Zmień tryb</span>
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
