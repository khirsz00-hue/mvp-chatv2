import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

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
    
    // Wait before retrying (true exponential backoff: 100ms, 200ms, 400ms)
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

export function useTasksQuery(date: string) {
  return useQuery({
    queryKey: ['tasks', date],
    queryFn: async () => {
      const session = await getSessionWithRetry()

      const response = await fetch(`/api/day-assistant-v2/dayplan?date=${date}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      return data.tasks as Task[]
    },
    staleTime: 30000, // 30s cache
    refetchInterval: 60000 // Auto-refetch every 60s
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const session = await getSessionWithRetry()
      console.log('✅ [useCompleteTask] Session obtained, completing task:', taskId)

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
      
      return response.json()
    },
    onMutate: async (taskId) => {
      // Optimistic update - remove completed task from list
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      queryClient.setQueryData(['tasks'], (old: Task[] = []) =>
        old.filter(t => t.id !== taskId)
      )
      
      return { previousTasks }
    },
    onError: (err, taskId, context) => {
      // Rollback on error
      queryClient.setQueryData(['tasks'], context?.previousTasks)
      
      // Show specific error message
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się ukończyć zadania'
      toast.error(`❌ ${errorMessage}`)
      
      console.error('❌ [useCompleteTask] Error:', err)
    },
    onSuccess: (data) => {
      // Show success message with warning if Todoist sync failed
      if (data.warning) {
        toast.warning(`⚠️ ${data.warning}`)
      } else {
        toast.success(data.message || '✅ Zadanie ukończone!')
      }
      
      // Invalidate recommendation cache
      queryClient.invalidateQueries({ queryKey: ['recommendation'] })
      
      console.log('✅ [useCompleteTask] Task completed:', data.todoist_synced ? 'with Todoist sync' : 'local only')
    }
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const session = await getSessionWithRetry()

      const response = await fetch(`/api/day-assistant-v2/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete task')
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      queryClient.setQueryData(['tasks'], (old: Task[] = []) =>
        old.filter(t => t.id !== taskId)
      )
      
      return { previousTasks, deletedTaskId: taskId }
    },
    onError: (err, taskId, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks)
      toast.error('Nie udało się usunąć zadania')
    },
    onSuccess: (data, taskId) => {
      toast.success('🗑️ Zadanie usunięte')
      
      // CRITICAL: Invalidate recommendation if it mentions deleted task
      const recommendation = queryClient.getQueryData(['recommendation']) as any
      if (recommendation?.primary_action?.task_id === taskId) {
        queryClient.invalidateQueries({ queryKey: ['recommendation'] })
      }
    }
  })
}

export function useTogglePinTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, pin }: { taskId: string; pin: boolean }) => {
      const session = await getSessionWithRetry()

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
      return response.json()
    },
    onMutate: async ({ taskId, pin }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      queryClient.setQueryData(['tasks'], (old: Task[] = []) =>
        old.map(t => t.id === taskId ? { ...t, is_must: pin } : t)
      )
      
      return { previousTasks }
    },
    onError: (err: any, vars, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks)
      toast.error(err.message || 'Nie udało się zmienić przypięcia')
    },
    onSuccess: (data, { pin }) => {
      toast.success(pin ? '📌 Przypięto jako MUST' : '📌 Odpięto z MUST')
    }
  })
}

export function usePostponeTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason?: string }) => {
      const session = await getSessionWithRetry()

      const response = await fetch('/api/day-assistant-v2/postpone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ task_id: taskId, reason: reason || 'Nie dziś', reserve_morning: true })
      })

      if (!response.ok) throw new Error('Failed to postpone task')
      return response.json()
    },
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      // Optimistically remove from today's list
      queryClient.setQueryData(['tasks'], (old: Task[] = []) =>
        old.filter(t => t.id !== taskId)
      )
      
      return { previousTasks }
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks)
      toast.error('Nie udało się przenieść zadania')
    },
    onSuccess: (data) => {
      toast.success('📅 Przeniesiono na jutro')
      queryClient.invalidateQueries({ queryKey: ['recommendation'] })
    }
  })
}

export function useToggleSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) => {
      const session = await getSessionWithRetry()

      const response = await fetch('/api/day-assistant-v2/subtasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subtask_id: subtaskId, completed })
      })

      if (!response.ok) throw new Error('Failed to toggle subtask')
      return response.json()
    },
    onMutate: async ({ subtaskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      // Optimistically update subtask in task list
      queryClient.setQueryData(['tasks'], (old: Task[] = []) =>
        old.map(task => ({
          ...task,
          subtasks: task.subtasks?.map(sub =>
            sub.id === subtaskId ? { ...sub, completed } : sub
          )
        }))
      )
      
      return { previousTasks }
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks)
      toast.error('Nie udało się zaktualizować kroku')
    },
    onSuccess: (data, { completed }) => {
      toast.success(completed ? '✅ Krok ukończony' : '↩️ Krok cofnięty')
    }
  })
}

export function useAcceptRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      proposalId, 
      action, 
      alternativeIndex, 
      rejectReason 
    }: { 
      proposalId: string
      action: 'accept_primary' | 'accept_alt' | 'reject'
      alternativeIndex?: number
      rejectReason?: string 
    }) => {
      const session = await getSessionWithRetry()

      const response = await fetch('/api/day-assistant-v2/proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          proposal_id: proposalId, 
          action, 
          alternative_index: alternativeIndex,
          reject_reason: rejectReason
        })
      })

      if (!response.ok) throw new Error('Failed to respond to recommendation')
      return response.json()
    },
    onMutate: async ({ proposalId }) => {
      await queryClient.cancelQueries({ queryKey: ['recommendations'] })
      
      const previousRecs = queryClient.getQueryData(['recommendations'])
      
      // Optimistically remove processed recommendation
      queryClient.setQueryData(['recommendations'], (old: any[] = []) =>
        old.filter(p => p.id !== proposalId)
      )
      
      return { previousRecs }
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['recommendations'], context?.previousRecs)
      toast.error('Nie udało się zaktualizować rekomendacji')
    },
    onSuccess: (data, { action, rejectReason }) => {
      if (action === 'reject' && rejectReason) {
        toast.info(`Odrzucono: ${rejectReason}`)
      } else if (action === 'accept_primary') {
        toast.success('✅ Rekomendacja zaakceptowana')
      } else {
        toast.success('✅ Alternatywa zaakceptowana')
      }
      // Refresh tasks to reflect recommendation changes
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}

export function useCreateSubtasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      steps 
    }: { 
      taskId: string
      steps: Array<{ content: string; estimated_duration: number; position: number }>
    }) => {
      const session = await getSessionWithRetry()

      const response = await fetch('/api/day-assistant-v2/subtasks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ task_id: taskId, steps })
      })

      if (!response.ok) throw new Error('Failed to create subtasks')
      return response.json()
    },
    onSuccess: (data, { taskId }) => {
      toast.success('✅ Kroki utworzone!')
      // Refresh tasks to show new subtasks
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => {
      toast.error('Nie udało się utworzyć kroków')
    }
  })
}
