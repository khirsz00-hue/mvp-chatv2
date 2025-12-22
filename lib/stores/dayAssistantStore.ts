import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { toast } from 'sonner'
import { debounce } from 'lodash'
import { TestDayTask, Proposal } from '@/lib/types/dayAssistantV2'
import { supabase } from '@/lib/supabaseClient'

interface DayAssistantState {
  // Core state
  tasks: TestDayTask[]
  energy: number
  focus: number
  contextFilter: string | null
  selectedDate: string
  workStartTime: string
  workEndTime: string
  
  // Computed state
  queuedTasks: TestDayTask[]
  laterTasks: TestDayTask[]
  mustTasks: TestDayTask[]
  topThreeTasks: TestDayTask[]
  recommendation: Proposal | null
  
  // Loading states
  isLoadingTasks: boolean
  isReorderingQueue: boolean
  isGeneratingRecommendation: boolean
  isSavingEnergy: boolean
  isSavingFocus: boolean
  
  // Actions
  setEnergy: (energy: number) => void
  setFocus: (focus: number) => void
  setContextFilter: (context: string | null) => void
  setWorkHours: (start: string, end: string) => void
  
  // Computed actions (client-side, instant)
  recomputeQueue: () => void
  
  // Async actions
  fetchTasks: () => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  postponeTask: (taskId: string, toDate: string, reason?: string) => Promise<void>
  togglePinTask: (taskId: string) => Promise<void>
  refreshRecommendation: () => Promise<void>
  
  // Initialization
  initialize: () => Promise<void>
}

export const useDayAssistantStore = create<DayAssistantState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    tasks: [],
    energy: 3,
    focus: 3,
    contextFilter: null,
    selectedDate: new Date().toISOString().split('T')[0],
    workStartTime: '09:00',
    workEndTime: '17:00',
    
    queuedTasks: [],
    laterTasks: [],
    mustTasks: [],
    topThreeTasks: [],
    recommendation: null,
    
    isLoadingTasks: false,
    isReorderingQueue: false,
    isGeneratingRecommendation: false,
    isSavingEnergy: false,
    isSavingFocus: false,
    
    // CLIENT-SIDE QUEUE RECOMPUTATION (INSTANT!)
    recomputeQueue: () => {
      const { tasks, energy, focus, contextFilter, workEndTime } = get()
      
      set({ isReorderingQueue: true })
      
      try {
        // Filter out completed tasks
        const activeTasks = tasks.filter(t => !t.completed)
        
        // Apply context filter
        const filteredTasks = contextFilter && contextFilter !== 'all'
          ? activeTasks.filter(t => t.context_type === contextFilter)
          : activeTasks
        
        // Score and sort (CLIENT-SIDE)
        const scoredTasks = scoreTasksClientSide(filteredTasks, { energy, focus })
        
        // Split by time availability
        const { queued, later } = splitQueueByTime(scoredTasks, workEndTime)
        
        // Split queued into MUST and regular
        const must = queued.filter(t => t.is_must)
        const regular = queued.filter(t => !t.is_must)
        const topThree = regular.slice(0, 3)
        
        set({
          queuedTasks: queued,
          laterTasks: later,
          mustTasks: must,
          topThreeTasks: topThree,
          isReorderingQueue: false
        })
      } catch (error) {
        console.error('[Store] Recompute queue error:', error)
        set({ isReorderingQueue: false })
      }
    },
    
    setEnergy: (energy) => {
      set({ energy, isSavingEnergy: true })
      get().recomputeQueue() // INSTANT update
      
      // Debounced API call
      debouncedSaveEnergyAndRefresh(energy, () => {
        set({ isSavingEnergy: false })
      })
    },
    
    setFocus: (focus) => {
      set({ focus, isSavingFocus: true })
      get().recomputeQueue() // INSTANT update
      
      debouncedSaveFocusAndRefresh(focus, () => {
        set({ isSavingFocus: false })
      })
    },
    
    setContextFilter: (contextFilter) => {
      set({ contextFilter })
      get().recomputeQueue() // INSTANT filter
    },
    
    setWorkHours: (workStartTime, workEndTime) => {
      set({ workStartTime, workEndTime })
      get().recomputeQueue()
    },
    
    fetchTasks: async () => {
      set({ isLoadingTasks: true })
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('No session')
        
        const response = await fetch('/api/day-assistant-v2/dayplan?' + new URLSearchParams({
          date: get().selectedDate
        }), {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (!response.ok) throw new Error('Failed to fetch tasks')
        
        const data = await response.json()
        set({ 
          tasks: data.tasks || [],
          energy: data.dayPlan?.energy || 3,
          focus: data.dayPlan?.focus || 3,
          workStartTime: data.dayPlan?.metadata?.work_start_time || '09:00',
          workEndTime: data.dayPlan?.metadata?.work_end_time || '17:00',
          isLoadingTasks: false 
        })
        get().recomputeQueue()
      } catch (error) {
        console.error('[Store] Fetch tasks error:', error)
        toast.error('Nie udało się pobrać zadań')
        set({ isLoadingTasks: false })
      }
    },
    
    completeTask: async (taskId) => {
      // OPTIMISTIC UPDATE
      const originalTasks = get().tasks
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, completed: true } : t
        )
      }))
      get().recomputeQueue() // Instant UI update
      
      try {
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
        
        if (!response.ok) throw new Error('API error')
        
        toast.success('✅ Zadanie ukończone!')
        await get().refreshRecommendation()
      } catch (error) {
        // ROLLBACK on error
        console.error('[Store] Complete task error:', error)
        set({ tasks: originalTasks })
        get().recomputeQueue()
        toast.error('Nie udało się ukończyć zadania')
      }
    },
    
    deleteTask: async (taskId) => {
      // OPTIMISTIC DELETE
      const originalTasks = get().tasks
      const deletedTask = originalTasks.find(t => t.id === taskId)
      
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
      }))
      get().recomputeQueue()
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('No session')
        
        const response = await fetch(`/api/day-assistant-v2/tasks/${taskId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (!response.ok) throw new Error('API error')
        
        toast.success('🗑️ Zadanie usunięte')
        
        // CRITICAL: Invalidate stale recommendation
        const { recommendation } = get()
        if (recommendation) {
          const mentionsDeletedTask =
            recommendation.primary_action?.task_id === taskId ||
            recommendation.alternatives?.some((a: any) => a.task_id === taskId)
          
          if (mentionsDeletedTask) {
            set({ recommendation: null })
            await get().refreshRecommendation()
          }
        }
      } catch (error) {
        // ROLLBACK
        console.error('[Store] Delete task error:', error)
        set({ tasks: originalTasks })
        get().recomputeQueue()
        toast.error('Nie udało się usunąć zadania')
      }
    },
    
    postponeTask: async (taskId, toDate, reason) => {
      const originalTasks = get().tasks
      
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? { ...t, due_date: toDate, postpone_count: t.postpone_count + 1 }
            : t
        )
      }))
      get().recomputeQueue()
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('No session')
        
        const response = await fetch('/api/day-assistant-v2/postpone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ task_id: taskId, to_date: toDate, reason })
        })
        
        if (!response.ok) throw new Error('API error')
        
        toast.success(`📅 Zadanie przełożone na ${toDate}`)
        await get().refreshRecommendation()
      } catch (error) {
        console.error('[Store] Postpone task error:', error)
        set({ tasks: originalTasks })
        get().recomputeQueue()
        toast.error('Nie udało się przełożyć zadania')
      }
    },
    
    togglePinTask: async (taskId) => {
      const originalTasks = get().tasks
      const task = originalTasks.find(t => t.id === taskId)
      if (!task) return
      
      const newPinState = !task.is_must
      
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, is_must: newPinState } : t
        )
      }))
      get().recomputeQueue()
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('No session')
        
        const response = await fetch('/api/day-assistant-v2/pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ task_id: taskId, pin: newPinState })
        })
        
        if (!response.ok) throw new Error('API error')
        
        toast.success(newPinState ? '📌 Przypięto jako MUST' : '📌 Odpięto z MUST')
      } catch (error) {
        console.error('[Store] Toggle pin error:', error)
        set({ tasks: originalTasks })
        get().recomputeQueue()
        toast.error('Nie udało się zmienić przypięcia')
      }
    },
    
    refreshRecommendation: async () => {
      set({ isGeneratingRecommendation: true })
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('No session')
        
        const { energy, focus, contextFilter, selectedDate, workStartTime, workEndTime } = get()
        
        const response = await fetch('/api/day-assistant-v2/recommend', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            date: selectedDate,
            energy,
            focus,
            context_filter: contextFilter,
            work_start_time: workStartTime,
            work_end_time: workEndTime
          })
        })
        
        if (!response.ok) throw new Error('API error')
        
        const data = await response.json()
        // Handle both single proposal and array of proposals
        const recommendation = data.proposal || (data.proposals && data.proposals[0]) || null
        set({ recommendation, isGeneratingRecommendation: false })
      } catch (error) {
        console.error('[Store] Refresh recommendation error:', error)
        set({ isGeneratingRecommendation: false })
      }
    },
    
    initialize: async () => {
      await get().fetchTasks()
      await get().refreshRecommendation()
    }
  }))
)

// CLIENT-SIDE SCORING (FAST!)
function scoreTasksClientSide(
  tasks: TestDayTask[],
  context: { energy: number; focus: number }
): TestDayTask[] {
  return tasks
    .map(task => ({
      ...task,
      _score: calculateScore(task, context)
    }))
    .sort((a: any, b: any) => (b._score || 0) - (a._score || 0))
}

function calculateScore(task: TestDayTask, context: any): number {
  let score = 50
  
  // Energy/focus match
  const energyDiff = Math.abs(task.cognitive_load - context.energy)
  score += Math.max(0, 30 - energyDiff * 10)
  
  // Priority
  if (task.is_must) score += 40
  else if (task.is_important) score += 25
  else score += (5 - task.priority) * 5
  
  // Deadline
  const today = new Date().toISOString().split('T')[0]
  if (task.due_date) {
    if (task.due_date < today) score += 30
    else if (task.due_date === today) score += 20
    else score += 10
  }
  
  // Postpone penalty
  score -= task.postpone_count * 5
  
  return Math.max(0, score)
}

function splitQueueByTime(
  tasks: TestDayTask[],
  workEndTime: string
): { queued: TestDayTask[]; later: TestDayTask[] } {
  const now = new Date()
  const [endHour, endMin] = workEndTime.split(':').map(Number)
  const workEnd = new Date()
  workEnd.setHours(endHour, endMin, 0, 0)
  
  const availableMinutes = Math.max(0, (workEnd.getTime() - now.getTime()) / 1000 / 60)
  
  let accumulatedTime = 0
  const queued: TestDayTask[] = []
  const later: TestDayTask[] = []
  
  for (const task of tasks) {
    if (accumulatedTime + task.estimate_min <= availableMinutes) {
      queued.push(task)
      accumulatedTime += task.estimate_min
    } else {
      later.push(task)
    }
  }
  
  return { queued, later }
}

// Debounced API calls
const debouncedSaveEnergyAndRefresh = debounce(async (energy: number, callback: () => void) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    const date = useDayAssistantStore.getState().selectedDate
    await fetch('/api/day-assistant-v2/dayplan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ date, energy })
    })
    await useDayAssistantStore.getState().refreshRecommendation()
  } finally {
    callback()
  }
}, 800)

const debouncedSaveFocusAndRefresh = debounce(async (focus: number, callback: () => void) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    const date = useDayAssistantStore.getState().selectedDate
    await fetch('/api/day-assistant-v2/dayplan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ date, focus })
    })
    await useDayAssistantStore.getState().refreshRecommendation()
  } finally {
    callback()
  }
}, 800)
