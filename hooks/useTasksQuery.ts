import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch('/api/day-assistant-v2/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ task_id: taskId })
      })

      if (!response.ok) throw new Error('Failed to complete task')
      return response.json()
    },
    onMutate: async (taskId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      queryClient.setQueryData(['tasks'], (old: Task[] = []) =>
        old.map(t => t.id === taskId ? { ...t, completed: true } : t)
      )
      
      return { previousTasks }
    },
    onError: (err, taskId, context) => {
      // Rollback on error
      queryClient.setQueryData(['tasks'], context?.previousTasks)
      toast.error('Nie udało się ukończyć zadania')
    },
    onSuccess: () => {
      toast.success('✅ Zadanie ukończone!')
      queryClient.invalidateQueries({ queryKey: ['recommendation'] })
    }
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch('/api/day-assistant-v2/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ task_id: taskId, pin })
      })

      if (!response.ok) throw new Error('Failed to pin task')
    },
    onMutate: async ({ taskId, pin }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      queryClient.setQueryData(['tasks'], (old: Task[] = []) =>
        old.map(t => t.id === taskId ? { ...t, is_must: pin } : t)
      )
      
      return { previousTasks }
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks)
      toast.error('Nie udało się zmienić przypięcia')
    },
    onSuccess: (data, { pin }) => {
      toast.success(pin ? '📌 Przypięto jako MUST' : '📌 Odpięto z MUST')
    }
  })
}
