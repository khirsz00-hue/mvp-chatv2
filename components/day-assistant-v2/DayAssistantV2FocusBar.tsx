/**
 * DayAssistantV2FocusBar Component
 * ADHD-friendly ultra-visible focus bar that appears when timer is active
 * Provides constant reminder of current task to prevent context switching
 */

'use client'

import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { Pause, Check, X, Play } from '@phosphor-icons/react'

interface FocusBarProps {
  task: TestDayTask | null
  elapsedSeconds: number
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onStop: () => void
}

export function DayAssistantV2FocusBar({ 
  task, 
  elapsedSeconds, 
  isPaused,
  onPause, 
  onResume,
  onComplete, 
  onStop 
}: FocusBarProps) {
  if (!task) return null

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    // Using custom color #1a1a2e as specified in design requirements for dark focus mode
    <div className="sticky top-0 z-[100] w-full bg-[#1a1a2e] text-white shadow-2xl border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          
          {/* Left: Timer + Task info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Large timer */}
            <div className="text-4xl font-mono font-bold tabular-nums text-white">
              {formatTime(elapsedSeconds)}
            </div>
            
            {/* Task details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <span className="uppercase tracking-wide font-medium">Current Focus</span>
                <span>Est. {task.estimate_min}m</span>
              </div>
              <h3 className="text-base font-semibold text-white truncate">
                {task.title}
              </h3>
            </div>
          </div>

          {/* Right: Action buttons (icon only) */}
          <div className="flex items-center gap-2">
            {!isPaused ? (
              <button
                onClick={onPause}
                className="p-3 hover:bg-gray-700 rounded-lg transition-colors"
                title="Pause"
                aria-label="Pause timer"
              >
                <Pause size={24} weight="fill" className="text-gray-300" />
              </button>
            ) : (
              <button
                onClick={onResume}
                className="p-3 hover:bg-gray-700 rounded-lg transition-colors"
                title="Resume"
                aria-label="Resume timer"
              >
                <Play size={24} weight="fill" className="text-green-400" />
              </button>
            )}
            
            <button
              onClick={onComplete}
              className="p-3 hover:bg-green-700 rounded-lg transition-colors"
              title="Mark as done"
              aria-label="Mark task as complete"
            >
              <Check size={24} weight="bold" className="text-green-400" />
            </button>
            
            <button
              onClick={onStop}
              className="p-3 hover:bg-red-700 rounded-lg transition-colors"
              title="Stop timer"
              aria-label="Stop timer"
            >
              <X size={24} weight="bold" className="text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
