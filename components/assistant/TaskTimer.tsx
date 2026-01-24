'use client'

import { useState, useEffect, useRef } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Timer as TimerIcon, Play, Pause, Stop, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { FocusMode } from '@/components/day-assistant-v2/FocusMode'

interface TimerSession {
  taskId: string
  taskTitle: string
  startTime: string
  endTime: string
  durationSeconds: number
}

interface TimerState {
  taskId: string | null
  taskTitle: string | null
  startTime: number | null
  elapsedSeconds: number
  isRunning: boolean
  isPaused: boolean
}

interface TaskTimerProps {
  onClose?: () => void
}

export function TaskTimer({ onClose }: TaskTimerProps) {
  const [timerState, setTimerState] = useState<TimerState>({
    taskId: null,
    taskTitle: null,
    startTime: null,
    elapsedSeconds: 0,
    isRunning: false,
    isPaused: false
  })
  const [focusModeActive, setFocusModeActive] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Load timer state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('taskTimer')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Calculate elapsed time if timer was running
      if (parsed.isRunning && parsed.startTime) {
        const now = Date.now()
        const elapsed = Math.floor((now - parsed.startTime) / 1000)
        parsed.elapsedSeconds = elapsed
      }
      setTimerState(parsed)
    }
  }, [])
  
  // Save timer state to localStorage
  useEffect(() => {
    if (timerState.taskId) {
      localStorage.setItem('taskTimer', JSON.stringify(timerState))
    } else {
      localStorage.removeItem('taskTimer')
    }
  }, [timerState])
  
  // Timer tick - calculate elapsed time from startTime
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => {
          if (!prev.startTime) return prev
          const now = Date.now()
          const elapsed = Math.floor((now - prev.startTime) / 1000)
          return {
            ...prev,
            elapsedSeconds: elapsed
          }
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime])
  
  const startTimer = (taskId: string, taskTitle: string) => {
    setTimerState({
      taskId,
      taskTitle,
      startTime: Date.now(),
      elapsedSeconds: 0,
      isRunning: true,
      isPaused: false
    })
  }
  
  const pauseTimer = () => {
    setTimerState(prev => {
      // Calculate final elapsed time before pausing
      let finalElapsed = prev.elapsedSeconds
      if (prev.isRunning && prev.startTime) {
        const now = Date.now()
        finalElapsed = Math.floor((now - prev.startTime) / 1000)
      }
      
      const newState = {
        ...prev,
        isPaused: true,
        isRunning: false,
        elapsedSeconds: finalElapsed
      }
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: newState }))
      return newState
    })
  }
  
  const resumeTimer = () => {
    setTimerState(prev => {
      const newState = {
        ...prev,
        isPaused: false,
        isRunning: true,
        startTime: Date.now() - (prev.elapsedSeconds * 1000)
      }
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: newState }))
      return newState
    })
  }
  
  const stopTimer = async () => {
    if (timerState.taskId && timerState.taskTitle && timerState.startTime) {
      // Calculate actual elapsed time
      let actualElapsed = timerState.elapsedSeconds
      if (timerState.isRunning) {
        const now = Date.now()
        actualElapsed = Math.floor((now - timerState.startTime) / 1000)
      }
      
      // Only save if there's actual elapsed time
      if (actualElapsed > 0) {
        // Use unified time tracking service
        const { saveTimeSession } = await import('@/lib/services/timeTrackingService')
        await saveTimeSession({
          task_id: timerState.taskId,
          task_title: timerState.taskTitle,
          started_at: new Date(timerState.startTime).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: actualElapsed,
          session_type: 'manual',
          task_source: 'assistant_tasks'
        })
      }
    }
    
    const newState = {
      taskId: null,
      taskTitle: null,
      startTime: null,
      elapsedSeconds: 0,
      isRunning: false,
      isPaused: false
    }
    setTimerState(newState)
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: newState }))
  }
  
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Don't render if no active timer
  if (!timerState.taskId) {
    return null
  }
  
  return (
    <>
      {/* Focus Mode Modal - renders when active */}
      {focusModeActive && (
        <FocusMode
          task={{
            title: timerState.taskTitle || 'Zadanie',
            elapsedSeconds: timerState.elapsedSeconds,
            isPaused: timerState.isPaused
          }}
          onExit={() => setFocusModeActive(false)}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={stopTimer}
        />
      )}

      <div className="fixed bottom-6 right-6 z-40">
      <Card className={cn(
        'p-4 shadow-2xl border-2 min-w-[280px]',
        timerState.isRunning && !timerState.isPaused ? 'border-red-500 animate-pulse' : 'border-gray-200'
      )}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              timerState.isRunning && !timerState.isPaused ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
            )} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {timerState.isRunning && !timerState.isPaused ? 'Live' : timerState.isPaused ? 'Paused' : 'Stopped'}
            </span>
          </div>
          <button 
            onClick={() => {
              stopTimer()
              onClose?.()
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        
        <h3 className="font-semibold text-sm mb-3 truncate" title={timerState.taskTitle || ''}>
          {timerState.taskTitle}
        </h3>
        
        <div className="text-4xl font-mono font-bold text-center mb-4 text-brand-purple">
          {formatTime(timerState.elapsedSeconds)}
        </div>
        
        <div className="flex gap-2">
          {!timerState.isRunning && !timerState.isPaused && (
            <Button
              onClick={() => timerState.taskId && timerState.taskTitle && startTimer(timerState.taskId, timerState.taskTitle)}
              className="flex-1 gap-2"
              variant="default"
            >
              <Play size={16} weight="fill" />
              Start
            </Button>
          )}
          
          {timerState.isRunning && !timerState.isPaused && (
            <Button
              onClick={pauseTimer}
              className="flex-1 gap-2"
              variant="outline"
            >
              <Pause size={16} weight="fill" />
              Pause
            </Button>
          )}
          
          {timerState.isPaused && (
            <Button
              onClick={resumeTimer}
              className="flex-1 gap-2"
              variant="default"
            >
              <Play size={16} weight="fill" />
              Resume
            </Button>
          )}
          
          <Button
            onClick={stopTimer}
            className="flex-1 gap-2"
            variant="destructive"
          >
            <Stop size={16} weight="fill" />
            Stop
          </Button>
        </div>
        
        {/* FOCUS button */}
        <Button
          onClick={() => setFocusModeActive(true)}
          className="w-full gap-2 mt-2 bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          👁️ FOCUS
        </Button>
      </Card>
    </div>
    </>
  )
}

// Export helper to start timer from other components
export function useTaskTimer() {
  const startTimer = (taskId: string, taskTitle: string) => {
    const timerState = {
      taskId,
      taskTitle,
      startTime: Date.now(),
      elapsedSeconds: 0,
      isRunning: true,
      isPaused: false
    }
    localStorage.setItem('taskTimer', JSON.stringify(timerState))
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: timerState }))
  }
  
  const stopTimer = async () => {
    const stored = localStorage.getItem('taskTimer')
    if (stored) {
      const parsed = JSON.parse(stored)
      
      // Save session to history if timer was running
      if (parsed.taskId && parsed.taskTitle && parsed.startTime) {
        // Calculate actual elapsed time
        let actualElapsed = parsed.elapsedSeconds || 0
        if (parsed.isRunning && parsed.startTime) {
          const now = Date.now()
          actualElapsed = Math.floor((now - parsed.startTime) / 1000)
        }
        
        // Only save if there's actual elapsed time
        if (actualElapsed > 0) {
          const { saveTimeSession } = await import('@/lib/services/timeTrackingService')
          await saveTimeSession({
            task_id: parsed.taskId,
            task_title: parsed.taskTitle,
            started_at: new Date(parsed.startTime).toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: actualElapsed,
            session_type: 'manual',
            task_source: 'assistant_tasks'
          })
        }
      }
    }
    
    // Clear timer
    localStorage.removeItem('taskTimer')
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: null }))
  }
  
  const getActiveTimer = (): { taskId: string | null; isActive: boolean } => {
    const stored = localStorage.getItem('taskTimer')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        taskId: parsed.taskId,
        isActive: parsed.isRunning || parsed.isPaused
      }
    }
    return { taskId: null, isActive: false }
  }
  
  return { startTimer, stopTimer, getActiveTimer }
}
