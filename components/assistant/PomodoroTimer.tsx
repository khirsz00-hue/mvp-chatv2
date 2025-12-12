'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Play, Pause, Stop, SkipForward, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

interface PomodoroState {
  taskId: string | null
  taskTitle: string | null
  phase: PomodoroPhase
  cycleCount: number
  remainingSeconds: number
  isRunning: boolean
}

interface PomodoroStats {
  today: number
  thisWeek: number
  lastReset: string
}

interface PomodoroTimerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId?: string
  taskTitle?: string
}

const WORK_DURATION = 25 * 60 // 25 minutes
const SHORT_BREAK_DURATION = 5 * 60 // 5 minutes
const LONG_BREAK_DURATION = 15 * 60 // 15 minutes
const CYCLES_BEFORE_LONG_BREAK = 4

export function PomodoroTimer({ open, onOpenChange, taskId, taskTitle }: PomodoroTimerProps) {
  const [state, setState] = useState<PomodoroState>({
    taskId: taskId || null,
    taskTitle: taskTitle || null,
    phase: 'work',
    cycleCount: 0,
    remainingSeconds: WORK_DURATION,
    isRunning: false
  })
  
  const [stats, setStats] = useState<PomodoroStats>({
    today: 0,
    thisWeek: 0,
    lastReset: new Date().toDateString()
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Load state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pomodoroState')
    if (stored) {
      const parsed = JSON.parse(stored)
      setState(parsed)
    }
    
    const storedStats = localStorage.getItem('pomodoroStats')
    if (storedStats) {
      const parsedStats = JSON.parse(storedStats)
      // Reset daily stats if it's a new day
      const today = new Date().toDateString()
      if (parsedStats.lastReset !== today) {
        parsedStats.today = 0
        parsedStats.lastReset = today
      }
      setStats(parsedStats)
    }
  }, [])
  
  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoroState', JSON.stringify(state))
  }, [state])
  
  useEffect(() => {
    localStorage.setItem('pomodoroStats', JSON.stringify(stats))
  }, [stats])
  
  // Update task info when props change
  useEffect(() => {
    if (taskId && taskTitle) {
      setState(prev => ({
        ...prev,
        taskId,
        taskTitle
      }))
    }
  }, [taskId, taskTitle])
  
  // Timer tick
  useEffect(() => {
    if (state.isRunning && state.remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          const newRemaining = prev.remainingSeconds - 1
          
          if (newRemaining === 0) {
            // Phase completed
            handlePhaseComplete(prev)
            return prev
          }
          
          return {
            ...prev,
            remainingSeconds: newRemaining
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
  }, [state.isRunning, state.remainingSeconds])
  
  const handlePhaseComplete = (currentState: PomodoroState) => {
    // Play notification sound
    playNotification()
    
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      if (currentState.phase === 'work') {
        new Notification('Pomodoro', {
          body: 'Czas na przerwę! 🎉',
          icon: '/favicon.ico'
        })
      } else {
        new Notification('Pomodoro', {
          body: 'Wracamy do pracy! 💪',
          icon: '/favicon.ico'
        })
      }
    }
    
    let newPhase: PomodoroPhase
    let newCycleCount = currentState.cycleCount
    let newRemaining: number
    
    if (currentState.phase === 'work') {
      newCycleCount++
      
      // Update stats
      setStats(prev => ({
        ...prev,
        today: prev.today + 1,
        thisWeek: prev.thisWeek + 1
      }))
      
      if (newCycleCount % CYCLES_BEFORE_LONG_BREAK === 0) {
        newPhase = 'longBreak'
        newRemaining = LONG_BREAK_DURATION
      } else {
        newPhase = 'shortBreak'
        newRemaining = SHORT_BREAK_DURATION
      }
    } else {
      newPhase = 'work'
      newRemaining = WORK_DURATION
    }
    
    setState(prev => ({
      ...prev,
      phase: newPhase,
      cycleCount: newCycleCount,
      remainingSeconds: newRemaining,
      isRunning: false
    }))
  }
  
  const playNotification = () => {
    // Simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }
  
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }
  
  const startTimer = () => {
    requestNotificationPermission()
    setState(prev => ({ ...prev, isRunning: true }))
  }
  
  const pauseTimer = () => {
    setState(prev => ({ ...prev, isRunning: false }))
  }
  
  const skipPhase = () => {
    handlePhaseComplete(state)
  }
  
  const stopTimer = () => {
    setState({
      taskId: state.taskId,
      taskTitle: state.taskTitle,
      phase: 'work',
      cycleCount: 0,
      remainingSeconds: WORK_DURATION,
      isRunning: false
    })
  }
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  const getPhaseLabel = (phase: PomodoroPhase): string => {
    switch (phase) {
      case 'work': return 'Praca'
      case 'shortBreak': return 'Krótka przerwa'
      case 'longBreak': return 'Długa przerwa'
    }
  }
  
  const getPhaseColor = (phase: PomodoroPhase): string => {
    switch (phase) {
      case 'work': return 'bg-brand-purple'
      case 'shortBreak': return 'bg-green-500'
      case 'longBreak': return 'bg-blue-500'
    }
  }
  
  const progress = state.phase === 'work' 
    ? ((WORK_DURATION - state.remainingSeconds) / WORK_DURATION) * 100
    : state.phase === 'shortBreak'
    ? ((SHORT_BREAK_DURATION - state.remainingSeconds) / SHORT_BREAK_DURATION) * 100
    : ((LONG_BREAK_DURATION - state.remainingSeconds) / LONG_BREAK_DURATION) * 100
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>🍅 Pomodoro Timer</span>
            <Badge variant="secondary" className="text-xs">
              Cykl {state.cycleCount + 1}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {/* Task info */}
          {state.taskTitle && (
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-1">Zadanie:</p>
              <p className="font-semibold text-lg truncate">{state.taskTitle}</p>
            </div>
          )}
          
          {/* Phase badge */}
          <div className="flex justify-center mb-6">
            <Badge className={cn('text-white', getPhaseColor(state.phase))}>
              {getPhaseLabel(state.phase)}
            </Badge>
          </div>
          
          {/* Circular progress */}
          <div className="relative w-64 h-64 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                className={cn(
                  'transition-all duration-1000',
                  state.phase === 'work' ? 'text-brand-purple' :
                  state.phase === 'shortBreak' ? 'text-green-500' : 'text-blue-500'
                )}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Timer display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-mono font-bold text-gray-900">
                  {formatTime(state.remainingSeconds)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Cycle indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'text-2xl',
                  i < state.cycleCount % 4 ? 'opacity-100' : 'opacity-30'
                )}
              >
                🍅
              </div>
            ))}
          </div>
          
          {/* Controls */}
          <div className="flex gap-2 justify-center">
            {!state.isRunning ? (
              <Button
                onClick={startTimer}
                className="gap-2"
                variant="default"
                size="lg"
              >
                <Play size={20} weight="fill" />
                Start
              </Button>
            ) : (
              <Button
                onClick={pauseTimer}
                className="gap-2"
                variant="outline"
                size="lg"
              >
                <Pause size={20} weight="fill" />
                Pause
              </Button>
            )}
            
            <Button
              onClick={skipPhase}
              className="gap-2"
              variant="outline"
              size="lg"
            >
              <SkipForward size={20} weight="fill" />
              Skip
            </Button>
            
            <Button
              onClick={stopTimer}
              className="gap-2"
              variant="destructive"
              size="lg"
            >
              <Stop size={20} weight="fill" />
              Stop
            </Button>
          </div>
          
          {/* Stats */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-brand-purple">{stats.today}</p>
                <p className="text-sm text-gray-500">Dzisiaj</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-purple">{stats.thisWeek}</p>
                <p className="text-sm text-gray-500">Ten tydzień</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
