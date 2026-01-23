/**
 * CurrentActivityBox Component
 * Shows "Aktualnie zajmujesz się:" box when timer is active or on break
 */

'use client'

import { useState, useEffect } from 'react'
import { TimerState } from '@/hooks/useTaskTimer'
import Button from '@/components/ui/Button'
import { Pause, Play, CheckCircle, XCircle } from '@phosphor-icons/react'
import { FocusMode } from './FocusMode'
import { cn } from '@/lib/utils'

interface CurrentActivityBoxProps {
  activeTimer: TimerState | null
  taskTitle?: string
  breakActive: boolean
  breakTimeRemaining: number
  formatTime: (seconds: number) => string
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onStop: () => void
}

export function CurrentActivityBox({
  activeTimer,
  taskTitle,
  breakActive,
  breakTimeRemaining,
  formatTime,
  onPause,
  onResume,
  onComplete,
  onStop
}: CurrentActivityBoxProps) {
  const [focusModeActive, setFocusModeActive] = useState(false)
  const [applyShake, setApplyShake] = useState(false)

  // Effect for shake animation
  useEffect(() => {
    if (!focusModeActive) return

    const shakeInterval = setInterval(() => {
      setApplyShake(true)
      setTimeout(() => setApplyShake(false), 1500) // Shake for 1.5s
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(shakeInterval)
  }, [focusModeActive])

  if (!activeTimer && !breakActive) {
    return null
  }

  // Calculate progress percentage for active task
  const progressPercentage = activeTimer
    ? Math.min(100, (activeTimer.elapsedSeconds / (activeTimer.estimatedMinutes * 60)) * 100)
    : 0

  // Break mode
  if (breakActive && !activeTimer) {
    return (
      <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
        <p className="text-sm text-green-600 font-semibold">☕ Przerwa</p>
        <p className="text-lg">Odpoczywasz - zostało {breakTimeRemaining}min</p>
      </div>
    )
  }

  // Active task mode
  if (activeTimer) {
    return (
      <>
        {/* Focus Mode component (renders button and backdrop) */}
        <FocusMode
          isActive={focusModeActive}
          onToggle={() => setFocusModeActive(!focusModeActive)}
          taskTitle={taskTitle || 'Zadanie'}
        />

        {/* Timer Box - stays sharp thanks to z-index */}
        <div className={cn(
          "sticky top-0 mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg shadow-md transition-all",
          focusModeActive ? "z-[90] shadow-2xl" : "z-10",
          applyShake && "focus-reminder-shake"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-purple-600 font-semibold">🎯 Aktualnie zajmujesz się:</p>
              <h3 className="text-lg font-bold mt-1">{taskTitle || 'Zadanie'}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Czas: {formatTime(activeTimer.elapsedSeconds)} / {activeTimer.estimatedMinutes}min
              </p>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
                  <span>Postęp</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="ml-4 flex gap-2">
              {activeTimer.isPaused ? (
                <Button size="sm" onClick={onResume}>
                  <Play size={16} className="mr-1" weight="fill" /> Wznów
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={onPause}>
                  <Pause size={16} className="mr-1" weight="fill" /> Pauza
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onStop} className="border-red-300 hover:bg-red-50">
                <XCircle size={16} className="mr-1" weight="fill" /> Stop
              </Button>
              <Button size="sm" onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                <CheckCircle size={16} className="mr-1" weight="fill" /> Ukończone
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return null
}
