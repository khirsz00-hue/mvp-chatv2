/**
 * DayAssistantV2FocusBar Component
 * ADHD-friendly ultra-visible focus bar that appears when timer is active
 * Dark slate-900 design with red pulse indicator
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { Pause, X, Play } from '@phosphor-icons/react'
import { FocusMode } from './FocusMode'
import { cn } from '@/lib/utils'

interface FocusBarProps {
  task: TestDayTask | null
  elapsedSeconds: number
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export function DayAssistantV2FocusBar({ 
  task, 
  elapsedSeconds, 
  isPaused,
  onPause, 
  onResume,
  onStop 
}: FocusBarProps) {
  const [focusModeActive, setFocusModeActive] = useState(false)
  const [applyShake, setApplyShake] = useState(false)
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Shake reminder from FocusMode every 5 minutes
  const handleShakeReminder = useCallback(() => {
    setApplyShake(true)
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current)
    }
    shakeTimeoutRef.current = setTimeout(() => {
      setApplyShake(false)
      shakeTimeoutRef.current = null
    }, 1500)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current)
      }
    }
  }, [])

  if (!task) return null

  // Format as MM:SS (not HH:MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn(
      "sticky top-0 bg-slate-900 rounded-xl shadow-lg hover:shadow-xl transition-shadow mb-3",
      focusModeActive ? "z-[90]" : "z-50"
    )}>

      <div className={cn(
        "flex items-center gap-4 p-3",
        applyShake && "focus-reminder-shake"
      )}>
        
        {/* Timer Display - WITHOUT red dot */}
        <div className="relative w-20 h-12 flex-shrink-0 bg-black/30 rounded-lg flex items-center justify-center px-2 border border-slate-800">
          <span className="text-lg font-bold text-white font-mono tracking-tight">
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* Task Info - CENTERED with red dot next to title */}
        <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
          
          {/* Red pulsing dot - next to title */}
          {!isPaused && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50 flex-shrink-0" />
          )}
          {isPaused && (
            <div className="w-3 h-3 bg-yellow-400 rounded-full flex-shrink-0" />
          )}
          
          <div className="flex-1 min-w-0 text-center">
            {/* Badge + Estimate */}
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-emerald-500/30">
                Current Focus
              </span>
              <span className="text-xs text-slate-400">
                Est. {task.estimate_min}m
              </span>
            </div>
            
            {/* Task title - LARGER FONT */}
            <h3 className="font-bold text-white text-lg leading-tight">
              {task.title}
            </h3>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <FocusMode
            isActive={focusModeActive}
            onToggle={() => setFocusModeActive(!focusModeActive)}
            onShakeReminder={handleShakeReminder}
            taskTitle={task.title}
          />
          {!isPaused ? (
            <button
              onClick={onPause}
              className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all flex items-center justify-center"
              title="Pause"
              aria-label="Pause timer"
            >
              <Pause size={14} weight="fill" />
            </button>
          ) : (
            <button
              onClick={onResume}
              className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-green-400 hover:text-green-300 rounded-lg transition-all flex items-center justify-center"
              title="Resume"
              aria-label="Resume timer"
            >
              <Play size={14} weight="fill" />
            </button>
          )}
          
          <button
            onClick={onStop}
            className="w-8 h-8 bg-slate-800 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500 rounded-lg transition-all flex items-center justify-center"
            title="Stop"
            aria-label="Stop timer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}
