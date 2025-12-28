/**
 * DayAssistantV2FocusBar Component
 * ADHD-friendly ultra-visible focus bar that appears when timer is active
 * Provides constant reminder of current task to prevent context switching
 */

'use client'

import { TestDayTask } from '@/lib/types/dayAssistantV2'
import Button from '@/components/ui/Button'
import { Pause, Check, X, Play } from '@phosphor-icons/react'

interface FocusBarProps {
  task: TestDayTask | null
  elapsedSeconds: number
  isPaused?: boolean
  onPause: () => void
  onResume?: () => void
  onComplete: () => void
  onStop: () => void
}

export function DayAssistantV2FocusBar({ 
  task, 
  elapsedSeconds, 
  isPaused = false,
  onPause, 
  onResume,
  onComplete, 
  onStop 
}: FocusBarProps) {
  if (!task) return null

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="sticky top-0 z-[100] bg-black text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Task info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              {!isPaused && (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </>
              )}
              {isPaused && (
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                {isPaused ? 'PAUZA - PRACOWAŁEŚ NAD' : 'PRACUJESZ NAD'}
              </div>
              <div className="text-lg font-bold truncate">
                {task.title}
              </div>
            </div>
          </div>

          {/* Right: Timer + Actions */}
          <div className="flex items-center gap-4">
            <div className="text-2xl font-mono font-bold tabular-nums">
              ⏱ {formatTime(elapsedSeconds)}
            </div>
            
            {!isPaused ? (
              <Button
                size="sm"
                onClick={onPause}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Pause size={16} weight="fill" />
                <span className="hidden sm:inline ml-1">Pauza</span>
              </Button>
            ) : onResume && (
              <Button
                size="sm"
                onClick={onResume}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play size={16} weight="fill" />
                <span className="hidden sm:inline ml-1">Wznów</span>
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={onComplete}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check size={16} weight="bold" />
              <span className="hidden sm:inline ml-1">Ukończ</span>
            </Button>
            
            <Button
              size="sm"
              onClick={onStop}
              variant="ghost"
              className="text-white hover:bg-gray-800"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
