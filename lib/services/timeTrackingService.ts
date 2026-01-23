/**
 * Unified Time Tracking Service
 * Saves time from both timers to one place (Supabase + localStorage backup)
 */

import { supabase } from '@/lib/supabaseClient'

export interface TimeSession {
  id?: string
  task_id: string
  task_title: string
  started_at: string
  ended_at: string
  duration_seconds: number
  session_type: 'manual' | 'pomodoro' | 'focus'
  task_source: 'assistant_tasks' | 'day_assistant_v2'
  created_at?: string
}

/**
 * Save time session to Supabase and localStorage backup
 */
export async function saveTimeSession(session: TimeSession): Promise<void> {
  try {
    const { data: { session: authSession } } = await supabase.auth.getSession()
    if (!authSession?.user) throw new Error('No auth session')

    // Save to Supabase
    const { error } = await supabase
      .from('time_sessions')
      .insert({
        user_id: authSession.user.id,
        task_id: session.task_id,
        task_source: session.task_source,
        task_title: session.task_title,
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_seconds: session.duration_seconds,
        session_type: session.session_type
      })

    if (error) throw error

    console.log('✅ Time session saved to database')

    // Backup to localStorage (for offline)
    const localSessions = JSON.parse(localStorage.getItem('allTimeSessions') || '[]')
    localSessions.push(session)
    localStorage.setItem('allTimeSessions', JSON.stringify(localSessions))

  } catch (error) {
    console.error('❌ Failed to save time session:', error)
    // Fallback: save only locally if Supabase fails
    const localSessions = JSON.parse(localStorage.getItem('allTimeSessions') || '[]')
    localSessions.push({ ...session, id: crypto.randomUUID() })
    localStorage.setItem('allTimeSessions', JSON.stringify(localSessions))
  }
}

/**
 * Get all time sessions for a task
 */
export async function getTaskTimeSessions(taskId: string, taskSource: string): Promise<TimeSession[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('No auth session')

    const { data, error } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('task_id', taskId)
      .eq('task_source', taskSource)
      .order('started_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch time sessions:', error)
    // Fallback: read from localStorage
    const localSessions = JSON.parse(localStorage.getItem('allTimeSessions') || '[]')
    return localSessions.filter((s: TimeSession) => 
      s.task_id === taskId && s.task_source === taskSource
    )
  }
}
