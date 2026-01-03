/**
 * ActiveTimerBar Component
 * Dark mode bar that appears when a timer is active
 * Replaces the light TopBar during active work sessions
 */

'use client'

import { Pause, Play, Stop } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'

export interface ActiveTimerBarProps {
  taskTitle: string
  elapsedSeconds: number
  estimatedMinutes: number
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onComplete: () => void
}

export function ActiveTimerBar({
  taskTitle,
  elapsedSeconds,
  estimatedMinutes,
  isPaused,
  onPause,
  onResume,
  onStop,
  onComplete
}: ActiveTimerBarProps) {
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  const progressPercent = estimatedMinutes > 0 
    ? Math.min(100, (elapsedMinutes / estimatedMinutes) * 100)
    : 0

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
          
          {/* Left: Task info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium">
                  {isPaused ? 'Wstrzymano' : 'Pracujesz nad'}
                </p>
                <h3 className="text-white font-bold text-sm sm:text-lg truncate" title={taskTitle}>
                  {taskTitle}
                </h3>
              </div>
            </div>
          </div>

          {/* Center: Timer display */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                {formatTime(elapsedSeconds)}
              </div>
              <div className="text-xs text-gray-400">
                z {estimatedMinutes} min
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {isPaused ? (
              <Button
                onClick={onResume}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
              >
                <Play size={14} weight="fill" className="sm:mr-1" />
                <span className="hidden sm:inline">Wznów</span>
              </Button>
            ) : (
              <Button
                onClick={onPause}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs sm:text-sm"
              >
                <Pause size={14} weight="fill" className="sm:mr-1" />
                <span className="hidden sm:inline">Pauza</span>
              </Button>
            )}
            
            <Button
              onClick={onComplete}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm"
            >
              ✓ <span className="hidden sm:inline">Ukończ</span>
            </Button>
            
            <Button
              onClick={onStop}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs sm:text-sm"
            >
              <Stop size={14} weight="fill" className="sm:mr-1" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 sm:mt-3 w-full h-1.5 sm:h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
