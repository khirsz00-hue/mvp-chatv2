/**
 * Hook: useTaskTimer
 * Manages task timer state and controls
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'

export interface TimerState {
  taskId: string
  startedAt: Date
  estimatedMinutes: number
  elapsedSeconds: number
  isPaused: boolean
}

export interface UseTaskTimerResult {
  activeTimer: TimerState | null
  startTimer: (task: TestDayTask) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  formatTime: (seconds: number) => string
  progressPercentage: number
}

/**
 * Hook to manage task timer
 */
export function useTaskTimer(): UseTaskTimerResult {
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Calculate progress percentage
  const progressPercentage = activeTimer
    ? Math.min(
        100,
        (activeTimer.elapsedSeconds / (activeTimer.estimatedMinutes * 60)) * 100
      )
    : 0

  // Start timer
  const startTimer = useCallback((task: TestDayTask) => {
    // Stop any existing timer and clean up state
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setActiveTimer(null) // Reset state first

    const newTimer: TimerState = {
      taskId: task.id,
      startedAt: new Date(),
      estimatedMinutes: task.estimate_min,
      elapsedSeconds: 0,
      isPaused: false
    }

    setActiveTimer(newTimer)

    // Start interval
    intervalRef.current = setInterval(() => {
      setActiveTimer(prev => {
        if (!prev || prev.isPaused) return prev
        return {
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1
        }
      })
    }, 1000)
  }, [])

  // Pause timer
  const pauseTimer = useCallback(() => {
    setActiveTimer(prev => prev ? { ...prev, isPaused: true } : null)
  }, [])

  // Resume timer
  const resumeTimer = useCallback(() => {
    setActiveTimer(prev => prev ? { ...prev, isPaused: false } : null)
  }, [])

  // Stop timer
  const stopTimer = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Save session if there was an active timer
    if (activeTimer && activeTimer.elapsedSeconds > 0) {
      try {
        const { saveTimeSession } = await import('@/lib/services/timeTrackingService')
        await saveTimeSession({
          task_id: activeTimer.taskId,
          task_title: '', // title not tracked in this timer state
          started_at: activeTimer.startedAt.toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: activeTimer.elapsedSeconds,
          session_type: 'focus',
          task_source: 'day_assistant_v2'
        })
      } catch (error) {
        console.error('Failed to save timer session:', error)
      }
    }
    
    setActiveTimer(null)
  }, [activeTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
    progressPercentage
  }
}
