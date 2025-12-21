/**
 * TaskTimer Component
 * Displays active task timer with progress bar and controls
 */

'use client'

import Button from '@/components/ui/Button'
import { Pause, Play, CheckCircle } from '@phosphor-icons/react'
import { TimerState } from '@/hooks/useTaskTimer'

interface TaskTimerProps {
  timer: TimerState
  formatTime: (seconds: number) => string
  progressPercentage: number
  onPause: () => void
  onResume: () => void
  onComplete: () => void
}

export function TaskTimer({
  timer,
  formatTime,
  progressPercentage,
  onPause,
  onResume,
  onComplete
}: TaskTimerProps) {
  const elapsedTime = formatTime(timer.elapsedSeconds)
  const estimatedTime = formatTime(timer.estimatedMinutes * 60)

  return (
    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-purple-900">
            ⏱️ {elapsedTime} / {estimatedTime}
          </span>
          <span className="text-sm text-purple-700">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        
        <div className="w-full bg-purple-200 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
        
        <div className="flex gap-2">
          {timer.isPaused ? (
            <Button size="sm" onClick={onResume}>
              <Play size={16} className="mr-1" weight="fill" /> Wznów
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause size={16} className="mr-1" weight="fill" /> Pauza
            </Button>
          )}
          <Button size="sm" onClick={onComplete}>
            <CheckCircle size={16} className="mr-1" weight="fill" /> Ukończone
          </Button>
        </div>
      </div>
    </div>
  )
}
