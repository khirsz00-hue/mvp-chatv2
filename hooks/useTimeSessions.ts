/**
 * Hook: useTimeSessions
 * Manages timer sessions with database persistence
 * Part of Day Assistant V2 Complete Overhaul
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type TaskSource = 'assistant_tasks' | 'day_assistant_v2'
export type SessionType = 'manual' | 'pomodoro'

export interface TimeSession {
  id: string
  user_id: string
  task_id: string
  task_source: TaskSource
  task_title: string
  started_at: string
  ended_at?: string | null
  duration_seconds?: number | null
  session_type: SessionType
  metadata?: Record<string, any>
  created_at: string
}

export interface ActiveSession {
  sessionId: string
  taskId: string
  taskTitle: string
  startedAt: string
  sessionType: SessionType
}

/**
 * Hook to manage time sessions with database persistence
 */
export function useTimeSessions(
  taskId: string,
  taskSource: TaskSource,
  taskTitle: string
) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)

  // Load active session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('activeTimerSession')
    if (stored) {
      try {
        const session = JSON.parse(stored)
        // Only restore if it's for the current task
        if (session.taskId === taskId) {
          setActiveSession(session)
        }
      } catch (e) {
        console.error('Failed to parse active timer session:', e)
        localStorage.removeItem('activeTimerSession')
      }
    }
  }, [taskId])

  // Listen for timer events from other tabs
  useEffect(() => {
    const handleTimerStarted = (event: CustomEvent) => {
      const session = event.detail
      if (session.task_id === taskId) {
        setActiveSession({
          sessionId: session.id,
          taskId: session.task_id,
          taskTitle: session.task_title,
          startedAt: session.started_at,
          sessionType: session.session_type
        })
      }
    }

    const handleTimerStopped = (event: CustomEvent) => {
      const { sessionId } = event.detail
      setActiveSession(prev => {
        if (prev?.sessionId === sessionId) {
          return null
        }
        return prev
      })
    }

    window.addEventListener('timerStarted', handleTimerStarted as EventListener)
    window.addEventListener('timerStopped', handleTimerStopped as EventListener)

    return () => {
      window.removeEventListener('timerStarted', handleTimerStarted as EventListener)
      window.removeEventListener('timerStopped', handleTimerStopped as EventListener)
    }
  }, [taskId])

  /**
   * Start a new timer session
   */
  const startSession = async (sessionType: SessionType = 'manual') => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Insert to database
      const { data, error } = await supabase
        .from('time_sessions')
        .insert({
          user_id: user.id,
          task_id: taskId,
          task_source: taskSource,
          task_title: taskTitle,
          started_at: new Date().toISOString(),
          session_type: sessionType
        })
        .select()
        .single()

      if (error) throw error

      // Save to localStorage as backup
      const sessionData: ActiveSession = {
        sessionId: data.id,
        taskId,
        taskTitle,
        startedAt: data.started_at,
        sessionType
      }
      
      localStorage.setItem('activeTimerSession', JSON.stringify(sessionData))
      setActiveSession(sessionData)

      // Dispatch event for cross-tab sync
      window.dispatchEvent(new CustomEvent('timerStarted', { detail: data }))

      return data
    } catch (error) {
      console.error('Failed to start timer session:', error)
      throw error
    }
  }

  /**
   * Stop the active timer session
   */
  const stopSession = async (sessionId: string) => {
    try {
      const endedAt = new Date().toISOString()
      const stored = localStorage.getItem('activeTimerSession')

      if (!stored) {
        throw new Error('No active session found')
      }

      const session: ActiveSession = JSON.parse(stored)
      const durationSeconds = Math.floor(
        (new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
      )

      // Update database
      const { error } = await supabase
        .from('time_sessions')
        .update({
          ended_at: endedAt,
          duration_seconds: durationSeconds
        })
        .eq('id', sessionId)

      if (error) throw error

      // Clear localStorage
      localStorage.removeItem('activeTimerSession')
      setActiveSession(null)

      // Dispatch event
      window.dispatchEvent(new CustomEvent('timerStopped', { 
        detail: { sessionId, durationSeconds } 
      }))

      return { sessionId, durationSeconds }
    } catch (error) {
      console.error('Failed to stop timer session:', error)
      throw error
    }
  }

  /**
   * Get all sessions for this task
   */
  const getSessions = async (): Promise<TimeSession[]> => {
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .select('*')
        .eq('task_id', taskId)
        .eq('task_source', taskSource)
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get sessions:', error)
      return []
    }
  }

  return { 
    activeSession,
    startSession, 
    stopSession, 
    getSessions 
  }
}
