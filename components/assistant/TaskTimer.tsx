'use client'

import { useState, useEffect, useRef } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Timer as TimerIcon, Play, Pause, Stop, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

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
  
  // Timer tick
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1
        }))
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
  }, [timerState.isRunning, timerState.isPaused])
  
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
      const newState = {
        ...prev,
        isPaused: true,
        isRunning: false
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
  
  const stopTimer = () => {
    if (timerState.taskId && timerState.taskTitle) {
      // Save session to history
      const sessions: TimerSession[] = JSON.parse(localStorage.getItem('timerSessions') || '[]')
      const newSession: TimerSession = {
        taskId: timerState.taskId,
        taskTitle: timerState.taskTitle,
        startTime: new Date(timerState.startTime!).toISOString(),
        endTime: new Date().toISOString(),
        durationSeconds: timerState.elapsedSeconds
      }
      sessions.push(newSession)
      localStorage.setItem('timerSessions', JSON.stringify(sessions))
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
      </Card>
    </div>
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
  
  const stopTimer = () => {
    const stored = localStorage.getItem('taskTimer')
    if (stored) {
      const parsed = JSON.parse(stored)
      
      // Save session to history if timer was running
      if (parsed.taskId && parsed.taskTitle) {
        const sessions: TimerSession[] = JSON.parse(localStorage.getItem('timerSessions') || '[]')
        const newSession: TimerSession = {
          taskId: parsed.taskId,
          taskTitle: parsed.taskTitle,
          startTime: new Date(parsed.startTime).toISOString(),
          endTime: new Date().toISOString(),
          durationSeconds: parsed.elapsedSeconds
        }
        sessions.push(newSession)
        localStorage.setItem('timerSessions', JSON.stringify(sessions))
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
