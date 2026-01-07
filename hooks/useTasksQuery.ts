import useSWR from 'swr'
import { supabase } from '@/lib/supabaseClient'

/**
 * Helper function to get session with retry logic
 * Fixes race condition where session is available but hook doesn't see it
 */
const MAX_SESSION_RETRY_ATTEMPTS = 3
const SESSION_ERROR_MESSAGE = 'Brak sesji - odśwież stronę i spróbuj ponownie'

async function getSessionWithRetry(maxAttempts = MAX_SESSION_RETRY_ATTEMPTS) {
  let session = null
  let attempts = 0
  
  while (!session && attempts < maxAttempts) {
    attempts++
    const { data: { session: currentSession }, error } = await supabase.auth.getSession()
    
    if (currentSession) {
      return currentSession
    }
    
    if (error) {
      console.error(`❌ Session error (attempt ${attempts}/${maxAttempts}):`, error)
    }
    
    // Wait before retrying (exponential backoff: 100ms, 200ms, 400ms)
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts - 1) * 100))
    }
  }
  
  throw new Error(SESSION_ERROR_MESSAGE)
}

export interface Task {
  id: string
  title: string
  description: string | null
  estimate_min: number
  cognitive_load: number
  context_type: string | null
  is_must: boolean
  is_important: boolean
  priority: number
  due_date: string | null
  completed: boolean
  postpone_count: number
  tags: string[]
  subtasks?: Subtask[]
}

export interface Subtask {
  id: string
  task_id: string
  content: string
  estimated_duration: number
  completed: boolean
  position: number
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const session = await getSessionWithRetry()
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch tasks')
  }
  
  const data = await response.json()
  return data
}

export function useTasksQuery(date: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/day-assistant-v2/dayplan?date=${date}`,
    fetcher,
    {
      // Auto-refresh every 30 seconds (Todoist sync)
      refreshInterval: 30000,
      
      // Refresh when user returns to tab
      revalidateOnFocus: true,
      
      // Refresh when internet reconnects
      revalidateOnReconnect: true,
      
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
      
      // Keep previous data while revalidating
      keepPreviousData: true,
    }
  )
  
  return {
    data: data?.tasks as Task[] | undefined,
    isLoading,
    error,
    mutate
  }
}

// Export only the types and the query hook
// All mutation actions are now in useTaskActions.ts
