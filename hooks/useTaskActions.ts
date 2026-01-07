import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
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

export function useTaskActions(date: string) {
  const { mutate } = useSWRConfig()
  
  const completeTask = async (taskId: string) => {
    const taskKey = `/api/day-assistant-v2/dayplan?date=${date}`
    
    try {
      const session = await getSessionWithRetry()
      console.log('✅ [useCompleteTask] Session obtained, completing task:', taskId)
      
      // Optimistic update with SWR
      await mutate(
        taskKey,
        async (currentData: any) => {
          if (!currentData) return currentData
          
          // Get current tasks
          const currentTasks = currentData.tasks || []
          
          // 1. Optimistically remove completed task from UI
          const optimisticTasks = currentTasks.filter((t: Task) => t.id !== taskId)
          
          // 2. Make API call in background
          const response = await fetch('/api/day-assistant-v2/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ task_id: taskId })
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to complete task' }))
            throw new Error(errorData.error || 'Failed to complete task')
          }
          
          const responseData = await response.json()
          
          // Show success message with warning if Todoist sync failed
          if (responseData.warning) {
            toast.warning(`⚠️ ${responseData.warning}`)
          } else {
            toast.success(responseData.message || '✅ Zadanie ukończone!')
          }
          
          console.log('✅ [useCompleteTask] Task completed:', responseData.todoist_synced ? 'with Todoist sync' : 'local only')
          
          // 3. Return optimistic data (task removed from list)
          return { ...currentData, tasks: optimisticTasks }
        },
        {
          // Show optimistic data immediately
          optimisticData: (current: any) => {
            if (!current) return current
            const currentTasks = current.tasks || []
            return {
              ...current,
              tasks: currentTasks.filter((t: Task) => t.id !== taskId)
            }
          },
          // Rollback on error
          rollbackOnError: true,
          // Use the data returned from the mutation function
          populateCache: true,
          // Don't revalidate - we already have fresh data from the API call
          revalidate: false,
        }
      )
      
      // Invalidate recommendation cache
      mutate('/api/day-assistant-v2/recommend?date=' + date)
      
    } catch (error) {
      // Error handling
      const errorMessage = error instanceof Error ? error.message : 'Nie udało się ukończyć zadania'
      toast.error(`❌ ${errorMessage}`)
      console.error('❌ [useCompleteTask] Error:', error)
      // SWR automatically rolls back on error
    }
  }
  
  const deleteTask = async (taskId: string) => {
    const taskKey = `/api/day-assistant-v2/dayplan?date=${date}`
    
    try {
      const session = await getSessionWithRetry()
      
      await mutate(
        taskKey,
        async (currentData: any) => {
          if (!currentData) return currentData
          
          const currentTasks = currentData.tasks || []
          
          // Optimistically remove task
          const optimisticTasks = currentTasks.filter((t: Task) => t.id !== taskId)
          
          // API call
          const response = await fetch(`/api/day-assistant-v2/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (!response.ok) {
            throw new Error('Failed to delete task')
          }
          
          toast.success('🗑️ Zadanie usunięte')
          
          return { ...currentData, tasks: optimisticTasks }
        },
        {
          optimisticData: (current: any) => {
            if (!current) return current
            const currentTasks = current.tasks || []
            return {
              ...current,
              tasks: currentTasks.filter((t: Task) => t.id !== taskId)
            }
          },
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      )
      
      // Invalidate recommendation cache if deleted task was in recommendation
      mutate('/api/day-assistant-v2/recommend?date=' + date)
      
    } catch (error) {
      console.error('Delete task error:', error)
      toast.error('Nie udało się usunąć zadania')
    }
  }
  
  const togglePinTask = async (taskId: string, pin: boolean) => {
    const taskKey = `/api/day-assistant-v2/dayplan?date=${date}`
    
    try {
      const session = await getSessionWithRetry()
      
      await mutate(
        taskKey,
        async (currentData: any) => {
          if (!currentData) return currentData
          
          const currentTasks = currentData.tasks || []
          
          // Optimistically update task
          const optimisticTasks = currentTasks.map((t: Task) =>
            t.id === taskId ? { ...t, is_must: pin } : t
          )
          
          // API call
          const response = await fetch('/api/day-assistant-v2/pin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ task_id: taskId, pin })
          })
          
          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to pin task' }))
            throw new Error(error.error || 'Failed to pin task')
          }
          
          toast.success(pin ? '📌 Przypięto jako MUST' : '📌 Odpięto z MUST')
          
          return { ...currentData, tasks: optimisticTasks }
        },
        {
          optimisticData: (current: any) => {
            if (!current) return current
            const currentTasks = current.tasks || []
            return {
              ...current,
              tasks: currentTasks.map((t: Task) =>
                t.id === taskId ? { ...t, is_must: pin } : t
              )
            }
          },
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      )
      
    } catch (error: any) {
      console.error('Pin task error:', error)
      toast.error(error.message || 'Nie udało się zmienić przypięcia')
    }
  }
  
  const postponeTask = async (taskId: string, reason?: string) => {
    const taskKey = `/api/day-assistant-v2/dayplan?date=${date}`
    
    try {
      const session = await getSessionWithRetry()
      
      await mutate(
        taskKey,
        async (currentData: any) => {
          if (!currentData) return currentData
          
          const currentTasks = currentData.tasks || []
          
          // Optimistically remove from today's list
          const optimisticTasks = currentTasks.filter((t: Task) => t.id !== taskId)
          
          // API call
          const response = await fetch('/api/day-assistant-v2/postpone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ task_id: taskId, reason: reason || 'Nie dziś', reserve_morning: true })
          })
          
          if (!response.ok) {
            throw new Error('Failed to postpone task')
          }
          
          toast.success('📅 Przeniesiono na jutro')
          
          return { ...currentData, tasks: optimisticTasks }
        },
        {
          optimisticData: (current: any) => {
            if (!current) return current
            const currentTasks = current.tasks || []
            return {
              ...current,
              tasks: currentTasks.filter((t: Task) => t.id !== taskId)
            }
          },
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      )
      
      // Invalidate recommendation cache
      mutate('/api/day-assistant-v2/recommend?date=' + date)
      
    } catch (error) {
      console.error('Postpone task error:', error)
      toast.error('Nie udało się przenieść zadania')
    }
  }
  
  const toggleSubtask = async (subtaskId: string, completed: boolean) => {
    const taskKey = `/api/day-assistant-v2/dayplan?date=${date}`
    
    try {
      const session = await getSessionWithRetry()
      
      await mutate(
        taskKey,
        async (currentData: any) => {
          if (!currentData) return currentData
          
          const currentTasks = currentData.tasks || []
          
          // Optimistically update subtask
          const optimisticTasks = currentTasks.map((task: Task) => ({
            ...task,
            subtasks: task.subtasks?.map(sub =>
              sub.id === subtaskId ? { ...sub, completed } : sub
            )
          }))
          
          // API call
          const response = await fetch('/api/day-assistant-v2/subtasks', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ subtask_id: subtaskId, completed })
          })
          
          if (!response.ok) {
            throw new Error('Failed to toggle subtask')
          }
          
          toast.success(completed ? '✅ Krok ukończony' : '↩️ Krok cofnięty')
          
          return { ...currentData, tasks: optimisticTasks }
        },
        {
          optimisticData: (current: any) => {
            if (!current) return current
            const currentTasks = current.tasks || []
            return {
              ...current,
              tasks: currentTasks.map((task: Task) => ({
                ...task,
                subtasks: task.subtasks?.map(sub =>
                  sub.id === subtaskId ? { ...sub, completed } : sub
                )
              }))
            }
          },
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      )
      
    } catch (error) {
      console.error('Toggle subtask error:', error)
      toast.error('Nie udało się zaktualizować kroku')
    }
  }
  
  return {
    completeTask,
    deleteTask,
    togglePinTask,
    postponeTask,
    toggleSubtask,
  }
}
