/**
 * Day Assistant V2 View - Web Version
 * Main view component for Day Assistant V2 functionality
 * Full-featured ADHD-friendly day planner with intelligent task queue
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { UniversalTaskModal, TaskData } from '@/components/common/UniversalTaskModal'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { TestDayTask, DayPlan, WorkMode } from '@/lib/types/dayAssistantV2'
import { scoreAndSortTasksV3 } from '@/lib/services/dayAssistantV2RecommendationEngine'
import { calculateAvailableMinutes } from '@/hooks/useTaskQueue'
import { DayAssistantV2StatusBar } from './DayAssistantV2StatusBar'
import { DayAssistantV2FocusBar } from './DayAssistantV2FocusBar'
import { WorkHoursModal } from './WorkHoursModal'
import { WorkModeModal } from './WorkModeModal'
import { OverdueAlert } from './OverdueAlert'
import { MeetingsSection } from './MeetingsSection'
import { DecisionLogPanel, Decision } from './DecisionLogPanel'
import { MorningReviewModal } from './MorningReviewModal'
import { DayAssistantV2TaskCard } from './DayAssistantV2TaskCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { logDecision } from '@/lib/services/dayAssistantV2Service'
import { useTaskTimer } from '@/hooks/useTaskTimer'
import Button from '@/components/ui/Button'
import { Plus, CalendarBlank, CaretDown, CaretUp } from '@phosphor-icons/react'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { useTaskActions } from '@/hooks/useTaskActions'
import { useSWRConfig } from 'swr'

const TOP_TASKS_COUNT = 3
const isValidTimeFormat = (value: string) => /^\d{2}:\d{2}$/.test(value)

interface TaskStats {
  completedToday: number
  totalToday: number
  pendingToday: number
  movedFromToday: number
  movedToToday: number
  addedToday: number
}

export function DayAssistantV2View() {
  // State
  const [tasks, setTasks] = useState<TestDayTask[]>([])
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null)
  const [assistant, setAssistant] = useState<any>(null)
  const [taskStats, setTaskStats] = useState<TaskStats>({
    completedToday: 0,
    totalToday: 0,
    pendingToday: 0,
    movedFromToday: 0,
    movedToToday: 0,
    addedToday: 0
  })
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [selectedDate] = useState(new Date().toISOString().split('T')[0])
  const [workMode, setWorkMode] = useState<WorkMode>('standard')
  const [showUniversalModal, setShowUniversalModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TestDayTask | null>(null)
  const [showWorkModeModal, setShowWorkModeModal] = useState(false)
  const [showWorkHoursModal, setShowWorkHoursModal] = useState(false)
  const [workHoursStart, setWorkHoursStart] = useState('09:00')
  const [workHoursEnd, setWorkHoursEnd] = useState('17:00')
  const [queueCollapsed, setQueueCollapsed] = useState(true)
  const [overflowCollapsed, setOverflowCollapsed] = useState(true)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [showOverdueModal, setShowOverdueModal] = useState(false)
  const overdueRef = useRef<HTMLDivElement>(null)
  
  // Project filtering state
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  
  // Custom hooks
  const { activeTimer, startTimer, pauseTimer, resumeTimer, stopTimer, formatTime } = useTaskTimer()
  const { mutate: globalMutate } = useSWRConfig()
  
  // SWR hooks for data fetching with optimistic updates
  const { data: queryTasks, isLoading: tasksLoading, error: tasksError } = useTasksQuery(selectedDate)
  const { completeTask, deleteTask, togglePinTask, postponeTask, toggleSubtask } = useTaskActions(selectedDate)

  // Load data on mount
  useEffect(() => {
    loadData()
    
    // Listen for task-added events (from FloatingAddButton)
    const handleTaskAdded = () => {
      // Invalidate SWR cache to refetch tasks
      globalMutate(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
    }
    window.addEventListener('task-added', handleTaskAdded)
    
    return () => {
      window.removeEventListener('task-added', handleTaskAdded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, globalMutate])
  
  // Sync React Query tasks with local state
  useEffect(() => {
    if (queryTasks) {
      // Cast Task[] to TestDayTask[] - they have compatible structures
      setTasks(queryTasks as unknown as TestDayTask[])
      setLoading(false)
    }
  }, [queryTasks])
  
  // Sync loading state
  useEffect(() => {
    if (tasksLoading) {
      setLoading(true)
    }
  }, [tasksLoading])
  
  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const response = await fetch('/api/todoist/projects', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setLoadingProjects(false)
      }
    }
    
    fetchProjects()
  }, [])

  const loadMeetings = useCallback(async () => {
    try {
      console.log('🔍 [DayAssistantV2] Loading meetings for date:', selectedDate)
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('❌ [DayAssistantV2] No session available for loading meetings')
        return
      }
      
      // Fetch meetings
      const response = await fetch(`/api/day-assistant-v2/meetings?date=${selectedDate}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch meetings')
      }
      
      const data = await response.json()
      
      // Check if Google Calendar is not connected
      if (data.error === 'Google Calendar not connected') {
        console.log('⚠️ [DayAssistantV2] Google Calendar not connected')
        setMeetings([])
        return
      }
      
      console.log(`🔍 [DayAssistantV2] API returned ${data.meetings?.length || 0} meetings:`, data.meetings)
      setMeetings(data.meetings || [])
      console.log(`✅ [DayAssistantV2] Loaded ${data.meetings?.length || 0} meetings`)
      
    } catch (error) {
      console.error('❌ [DayAssistantV2] Error loading meetings:', error)
      setMeetings([])
    }
  }, [selectedDate])

  // Load meetings on mount and when selectedDate changes
  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  // Load decisions from database
  useEffect(() => {
    const fetchDecisions = async () => {
      if (!dayPlan?.assistant_id) return
      
      try {
        const { data, error } = await supabase
          .from('day_assistant_v2_decision_log')
          .select('id, action, reason, timestamp, context')
          .eq('assistant_id', dayPlan.assistant_id)
          .order('timestamp', { ascending: false })
          .limit(10)
        
        if (error) throw error
        
        setDecisions(data.map(d => ({
          id: d.id,
          text: d.reason || d.action,
          timestamp: d.timestamp
        })))
      } catch (err) {
        console.error('Failed to fetch decisions:', err)
      }
    }
    
    fetchDecisions()
  }, [dayPlan?.assistant_id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Sesja wygasła - zaloguj się ponownie')
        return
      }
      
      setSessionToken(session.access_token)
      
      // Fetch day plan metadata (tasks are handled by React Query)
      const response = await fetch(`/api/day-assistant-v2/dayplan?date=${selectedDate}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch day plan')
      }
      
      const data = await response.json()
      setDayPlan(data.dayPlan)
      // Don't set tasks here - React Query handles it
      setAssistant(data.assistant)
      setTaskStats(data.taskStats || taskStats)
      if (data.dayPlan?.metadata?.work_start_time && isValidTimeFormat(data.dayPlan.metadata.work_start_time)) {
        setWorkHoursStart(data.dayPlan.metadata.work_start_time)
      }
      if (data.dayPlan?.metadata?.work_end_time && isValidTimeFormat(data.dayPlan.metadata.work_end_time)) {
        setWorkHoursEnd(data.dayPlan.metadata.work_end_time)
      }
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Błąd podczas ładowania danych')
    } finally {
      // Don't set loading false here - React Query handles it
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      // Use optimistic mutation - no loadData() call needed!
      await completeTask(taskId)
      
      // Stop timer if this task was active
      if (activeTimer?.taskId === taskId) {
        stopTimer()
      }
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Error completing task:', error)
    }
  }

  const handlePinTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      const newIsMust = !task?.is_must
      
      // Use optimistic mutation - no loadData() call needed!
      await togglePinTask(taskId, newIsMust)
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Error pinning task:', error)
    }
  }

  const handlePostponeTask = async (taskId: string) => {
    try {
      // Use optimistic mutation - no loadData() call needed!
      await postponeTask(taskId)
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Error postponing task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      // Use optimistic mutation - no loadData() call needed!
      await deleteTask(taskId)
      
      // Stop timer if this task was active
      if (activeTimer?.taskId === taskId) {
        stopTimer()
      }
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Error deleting task:', error)
    }
  }

  const handleStartTimer = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      startTimer(task)
      toast.success(`⏱️ Timer uruchomiony: ${task.title}`)
    }
  }

  const handleHelp = async (taskId: string) => {
    // Open "Help me" modal or decompose task
    toast.info('Funkcja "Pomoc" w przygotowaniu')
  }

  const handleOpenDetails = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setEditingTask(task)
      setShowUniversalModal(true)
    }
  }

  const handleTaskSave = async (taskData: TaskData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      console.log('🎯 [HANDLER] Received priority:', taskData.priority)
      
      const payload = {
        title: taskData.content,
        description: taskData.description,
        estimate_min: taskData.estimated_minutes,
        cognitive_load: taskData.cognitive_load,
        due_date: taskData.due,
        priority: taskData.priority,
        tags: taskData.labels || []
      }
      
      console.log('🎯 [HANDLER] Payload priority:', payload.priority)
      
      if (editingTask) {
        // Update existing task
        if (!editingTask.id) {
          toast.error('Brak ID zadania')
          return
        }
        const response = await fetch('/api/day-assistant-v2/task', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            task_id: editingTask.id,
            ...payload
          })
        })
        
        if (!response.ok) throw new Error('Failed to update task')
        toast.success('✅ Zadanie zaktualizowane')
      } else {
        // Create new task
        const response = await fetch('/api/day-assistant-v2/task', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...payload,
            is_must: false,
            is_important: false,
            context_type: 'deep_work'
          })
        })
        
        if (!response.ok) throw new Error('Failed to create task')
        toast.success('✅ Zadanie dodane')
      }
      
      setShowUniversalModal(false)
      setEditingTask(null)
      // Invalidate SWR cache to refetch tasks
      globalMutate(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
    } catch (error) {
      console.error('Error saving task:', error)
      toast.error('Błąd podczas zapisywania zadania')
    }
  }

  const handleWorkModeChange = (mode: WorkMode) => {
    setWorkMode(mode)
    toast.success(`Tryb pracy: ${mode}`)
    // Work mode is client-side filtering only
  }

  const handleWorkHoursChange = async (start: string, end: string) => {
    if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) {
      toast.error('Nieprawidłowy format godzin pracy')
      return
    }
    
    const workHours = calculateWorkHours(start, end)
    if (workHours <= 0) {
      toast.error('Zakończenie pracy musi być po rozpoczęciu')
      return
    }
    
    setWorkHoursStart(start)
    setWorkHoursEnd(end)
    const capacityMinutes = workHours * 60
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Sesja wygasła - zaloguj się ponownie')
        return
      }
      
      const response = await fetch('/api/day-assistant-v2/dayplan', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          metadata: {
            work_start_time: start,
            work_end_time: end,
            capacity_minutes: capacityMinutes
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update work hours')
      }
      
      const updated = await response.json()
      const updatedMetadata = updated?.dayPlan?.metadata
      
      if (!updatedMetadata) {
        console.warn('[DayAssistantV2] Unexpected response when updating work hours', updated)
        return
      }
      
      setDayPlan(prev => {
        if (prev) {
          return { ...prev, metadata: { ...prev.metadata, ...updatedMetadata } }
        }
        if (updated?.dayPlan) {
          return { ...updated.dayPlan, metadata: updatedMetadata }
        }
        return prev
      })
    } catch (error) {
      console.error('Error updating work hours:', error)
      toast.error('Nie udało się zapisać godzin pracy')
    }
  }

  const handleReviewOverdue = () => {
    // Open modal instead of scrolling
    setShowOverdueModal(true)
  }

  const handleLogDecision = async (text: string) => {
    if (!dayPlan?.assistant_id) return
    
    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        toast.error('Sesja wygasła - zaloguj się ponownie')
        return
      }
      
      const entry = await logDecision(
        user.id,
        dayPlan.assistant_id,
        'manual_decision',
        { reason: text },
        supabase
      )
      
      if (entry) {
        setDecisions(prev => [{
          id: entry.id,
          text: text,
          timestamp: entry.timestamp
        }, ...prev])
        toast.success('Decyzja zapisana!')
      }
    } catch (err) {
      console.error('Failed to log decision:', err)
      toast.error('Nie udało się zapisać decyzji')
    }
  }

  const handleKeepOverdueToday = async (task: TestDayTask) => {
    // Just keep the due date as today - no API call needed for now
    toast.success(`📅 ${task.title} pozostaje na dziś`)
    // Invalidate to refresh
    globalMutate(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
  }

  const handleOverdueAddToday = async (task: TestDayTask) => {
    // Update task to have today's date
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch('/api/day-assistant-v2/task', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: task.id,
          due_date: selectedDate
        })
      })
      
      if (!response.ok) throw new Error('Failed to update task')
      
      toast.success(`📅 ${task.title} dodane na dziś`)
      // Invalidate SWR cache to refetch tasks
      globalMutate(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
    } catch (error) {
      console.error('Error updating task date:', error)
      toast.error('Błąd podczas aktualizacji zadania')
    }
  }

  const handleOverdueMoveToTomorrow = async (task: TestDayTask) => {
    await handlePostponeTask(task.id)
  }

  const handleOverdueReschedule = async (task: TestDayTask, date?: string) => {
    if (!date) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch('/api/day-assistant-v2/task', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: task.id,
          due_date: date
        })
      })
      
      if (!response.ok) throw new Error('Failed to reschedule task')
      
      toast.success(`📅 ${task.title} przeniesione na ${date}`)
      // Invalidate SWR cache to refetch tasks
      globalMutate(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
    } catch (error) {
      console.error('Error rescheduling task:', error)
      toast.error('Błąd podczas przesuwania zadania')
    }
  }

  const handleOverdueDelete = async (task: TestDayTask) => {
    await handleDeleteTask(task.id)
  }

  const handleOverdueComplete = async (task: TestDayTask) => {
    await handleCompleteTask(task.id)
  }

  const handleRefreshMeetings = async () => {
    try {
      console.log('🔄 [DayAssistantV2] Refreshing meetings')
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Sesja wygasła - zaloguj się ponownie')
        return
      }
      
      // Fetch meetings with force refresh
      const response = await fetch(`/api/day-assistant-v2/meetings?date=${selectedDate}&force=true`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to refresh meetings')
      }
      
      const data = await response.json()
      
      // Check if Google Calendar is not connected
      if (data.error === 'Google Calendar not connected') {
        toast.error('📅 Google Calendar nie jest połączony')
        setMeetings([])
        return
      }
      
      setMeetings(data.meetings || [])
      toast.success('✅ Spotkania odświeżone')
      console.log(`✅ [DayAssistantV2] Refreshed ${data.meetings?.length || 0} meetings`)
      
    } catch (error) {
      console.error('❌ [DayAssistantV2] Error refreshing meetings:', error)
      toast.error('❌ Błąd podczas ładowania spotkań')
    }
  }

  // Filter tasks by work mode and project
  const filteredTasks = tasks.filter(task => {
    // Filter by project if selected (handle both null and empty string)
    if (selectedProjectId && selectedProjectId.trim() !== '' && task.project_id !== selectedProjectId) {
      return false
    }
    
    // Filter by work mode
    if (workMode === 'low_focus') {
      return task.cognitive_load <= 2
    } else if (workMode === 'hyperfocus') {
      return task.cognitive_load >= 4
    } else if (workMode === 'quick_wins') {
      return task.estimate_min < 20
    }
    return true // standard mode shows all
  })

  // Helper function to validate priority
  const validatePriority = (priority: number): 1 | 2 | 3 | 4 => {
    return (priority >= 1 && priority <= 4 ? priority : 1) as 1 | 2 | 3 | 4
  }

  // Score and sort tasks FIRST using V3 algorithm
  const scoredTasks = useMemo(() => {
    if (!dayPlan) return filteredTasks
    
    console.log('🎯 [DayAssistantV2] Scoring', filteredTasks.length, 'tasks with scoreAndSortTasksV3')
    const scored = scoreAndSortTasksV3(filteredTasks, dayPlan, selectedDate, selectedProjectId)
    
    console.log('📊 [DayAssistantV2] Top 5 scored tasks:')
    scored.slice(0, 5).forEach((task, idx) => {
      console.log(`  #${idx + 1}. "${task.title.substring(0, 40)}" - Score: ${task.metadata?._score || 0}`)
    })
    
    return scored
  }, [filteredTasks, dayPlan, selectedDate, selectedProjectId])

  // Helper function to calculate total work hours (for validation only)
  // For actual capacity calculation, use calculateAvailableMinutes
  function calculateWorkHours(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    return Math.max(0, (endMinutes - startMinutes) / 60)
  }

  // THEN divide into sections based on scoring and capacity
  const { mustTasks, top3Tasks, queueTasks, overflowTasks, overdueTasks } = useMemo(() => {
    const sections = {
      mustTasks: [] as TestDayTask[],
      top3Tasks: [] as TestDayTask[],
      queueTasks: [] as TestDayTask[],
      overflowTasks: [] as TestDayTask[],
      overdueTasks: [] as TestDayTask[]
    }
    
    // Extract overdue tasks first
    const overdue = scoredTasks.filter(t => !t.completed && t.due_date && t.due_date < selectedDate)
    sections.overdueTasks = overdue
    
    // Extract MUST tasks (excluding overdue)
    const must = scoredTasks.filter(t => !t.completed && t.is_must && !(t.due_date && t.due_date < selectedDate))
    sections.mustTasks = must
    
    // Tasks due today (exclude overdue and MUST - handled separately)
    const todayNonMustTasks = scoredTasks.filter(t => 
      !t.completed && 
      !t.is_must &&
      !(t.due_date && t.due_date < selectedDate) &&
      t.due_date === selectedDate
    )
    
    // Calculate capacity using FULL work hours (not remaining time from now)
    // This gives us the total capacity for the day (e.g., 9:00-17:00 = 8h = 480min)
    const capacityMinutes = calculateWorkHours(workHoursStart, workHoursEnd) * 60
    
    console.log('📊 [Capacity Calc]', {
      workHours: `${workHoursStart} - ${workHoursEnd}`,
      totalMinutes: capacityMinutes,
      tasksForToday: todayNonMustTasks.length,
      todayTasksTime: todayNonMustTasks.reduce((sum, t) => sum + (t.estimate_min || 0), 0)
    })
    
    // Top 3 purely by scoring (first 3 tasks for today, when capacity is available)
    sections.top3Tasks = todayNonMustTasks.slice(0, TOP_TASKS_COUNT)
    
    const remainingTodayTasks = todayNonMustTasks.slice(TOP_TASKS_COUNT)
    
    // Calculate used capacity by MUST and Top 3 tasks
    const mustMinutes = must.reduce((sum, t) => sum + (t.estimate_min || 0), 0)
    const top3Minutes = sections.top3Tasks.reduce((sum, t) => sum + (t.estimate_min || 0), 0)
    let remainingCapacity = Math.max(0, capacityMinutes - mustMinutes - top3Minutes)
    
    console.log('📊 [DayAssistantV2] Capacity:', {
      total: capacityMinutes,
      mustUsed: mustMinutes,
      top3Used: top3Minutes,
      subtotal: mustMinutes + top3Minutes,
      remaining: remainingCapacity,
      todayTasksCount: todayNonMustTasks.length,
      remainingTasksCount: remainingTodayTasks.length
    })
    
    // Allocate remaining tasks to Queue or Overflow based on remaining capacity
    for (const task of remainingTodayTasks) {
      const taskMinutes = task.estimate_min || 0
      
      if (remainingCapacity >= taskMinutes) {
        sections.queueTasks.push(task)
        remainingCapacity -= taskMinutes
        console.log(`  ✅ Queue: "${task.title}" (${taskMinutes}min, score: ${task.metadata?._score || 0})`)
      } else {
        sections.overflowTasks.push(task)
        console.log(`  📦 Overflow: "${task.title}" (${taskMinutes}min > ${remainingCapacity}min remaining)`)
      }
    }
    
    // Tasks without due date or future dates also go to overflow
    const futureTasks = scoredTasks.filter(t =>
      !t.completed &&
      !t.is_must &&
      !(t.due_date && t.due_date < selectedDate) &&
      (!t.due_date || t.due_date > selectedDate)
    )
    sections.overflowTasks.push(...futureTasks)
    
    // Final summary logging
    const totalUsedMinutes = [...sections.mustTasks, ...sections.top3Tasks, ...sections.queueTasks]
      .reduce((sum, t) => sum + (t.estimate_min || 0), 0)
    const overflowMinutes = sections.overflowTasks
      .reduce((sum, t) => sum + (t.estimate_min || 0), 0)
    
    console.log('✅ [buildSmartQueue] Final split:', {
      must: sections.mustTasks.length,
      top3: sections.top3Tasks.length,
      queue: sections.queueTasks.length,
      overflow: sections.overflowTasks.length,
      overdue: sections.overdueTasks.length,
      usedTime: totalUsedMinutes,
      overflowTime: overflowMinutes,
      capacity: capacityMinutes,
      remainingCapacity: capacityMinutes - totalUsedMinutes
    })
    
    return sections
  }, [scoredTasks, selectedDate, workHoursStart, workHoursEnd])

  // Calculate time stats
  const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimate_min || 0), 0)
  const completedMinutes = tasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + (t.estimate_min || 0), 0)
  
  // Calculate completed and scheduled task counts for Today's Flow
  const completedTasksCount = tasks.filter(t => t.completed && t.due_date === selectedDate).length
  const scheduledTasksCount = tasks.filter(t => !t.completed && t.due_date === selectedDate).length
  
  // Calculate scheduled minutes - all non-completed tasks scheduled for today
  const scheduledMinutes = useMemo(() => {
    const todayTasks = tasks.filter(t => t.due_date === selectedDate && !t.completed)
    const scheduled = todayTasks.reduce((sum, t) => sum + (t.estimate_min || 0), 0)
    
    // Optional debug logging (can be enabled for debugging)
    if (process.env.NODE_ENV === 'development') {
      const available = Math.max(0, calculateWorkHours(workHoursStart, workHoursEnd) * 60)
      console.log('🔍 [Day Overload Debug]', {
        totalTasks: tasks.length,
        todayTasks: todayTasks.length,
        scheduledMinutes: scheduled,
        availableMinutes: available,
        overloadPercent: available > 0 ? Math.round((scheduled / available) * 100) : 0
      })
    }
    
    return scheduled
  }, [tasks, selectedDate, workHoursStart, workHoursEnd])
  
  const availableMinutes = Math.max(0, calculateWorkHours(workHoursStart, workHoursEnd) * 60)
  const usagePercentage = availableMinutes > 0
    ? Math.min(100, Math.round((totalEstimatedMinutes / availableMinutes) * 100))
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Focus Bar - shows ABOVE status bar when timer is active */}
      {activeTimer && (
        <div className="sticky top-0 z-50 bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-6">
          <div className="max-w-[1536px] mx-auto px-4 sm:px-6">
            <DayAssistantV2FocusBar
              task={tasks.find(t => t.id === activeTimer.taskId) || null}
              elapsedSeconds={activeTimer.elapsedSeconds}
              isPaused={activeTimer.isPaused || false}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onStop={stopTimer}
            />
          </div>
        </div>
      )}

      {/* Status Bar - ALWAYS VISIBLE */}
      <div className={`${activeTimer ? '' : 'sticky top-0 z-40'} bg-gradient-to-br from-purple-50 via-white to-pink-50 ${activeTimer ? 'pt-0' : 'pt-6'}`}>
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6">
          <DayAssistantV2StatusBar
            workHoursStart={workHoursStart}
            workHoursEnd={workHoursEnd}
            workMode={workMode}
            usedMinutes={scheduledMinutes}
            totalCapacity={availableMinutes}
            onEditWorkHours={() => setShowWorkHoursModal(true)}
            onEditMode={() => setShowWorkModeModal(true)}
            selectedProject={selectedProjectId}
            projects={projects}
            onProjectChange={setSelectedProjectId}
            completedCount={completedTasksCount}
            scheduledCount={scheduledTasksCount}
          />
        </div>
      </div>

      {/* Overdue Alert Banner */}
      <OverdueAlert 
        overdueCount={overdueTasks.length}
        onReview={handleReviewOverdue}
      />

      {/* Main Layout: Content + Sidebar */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          
          {/* Meetings Section */}
          <MeetingsSection
            meetings={meetings}
            onRefresh={handleRefreshMeetings}
          />

          {/* MUST Section */}
          {mustTasks.length > 0 && (
            <div className="mb-6">
              {/* Section Header - NO BACKGROUND BOX */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-red-600">🔴 MUST (max 3)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Zadania krytyczne • <span className="font-semibold">{mustTasks.reduce((sum, t) => sum + t.estimate_min, 0)} min</span> (est time)
              </p>
              
              {/* Task Cards */}
              <div className="space-y-3">
                {mustTasks.map(task => (
                  <DayAssistantV2TaskCard
                    key={task.id}
                    task={task}
                    onStartTimer={handleStartTimer}
                    onComplete={handleCompleteTask}
                    onHelp={handleHelp}
                    onPin={handlePinTask}
                    onPostpone={handlePostponeTask}
                    onDelete={handleDeleteTask}
                    onOpenDetails={handleOpenDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top 3 Section */}
          {top3Tasks.length > 0 && (
            <div className="mb-6">
              {/* Section Header - NO BACKGROUND BOX */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-800">⭐ Top 3 zadania na dziś</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Top scored na dziś • <span className="font-semibold">{top3Tasks.reduce((sum, t) => sum + t.estimate_min, 0)} min</span> (est time)
              </p>
              
              {/* Task Cards */}
              <div className="space-y-3">
                {top3Tasks.map((task, idx) => (
                  <DayAssistantV2TaskCard
                    key={task.id}
                    task={task}
                    queuePosition={idx + 1}
                    onStartTimer={handleStartTimer}
                    onComplete={handleCompleteTask}
                    onHelp={handleHelp}
                    onPin={handlePinTask}
                    onPostpone={handlePostponeTask}
                    onDelete={handleDeleteTask}
                    onOpenDetails={handleOpenDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Queue Section - Collapsible */}
          {queueTasks.length > 0 && (
            <div className="mb-6">
              {/* Section Header - Collapsible */}
              <div 
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => setQueueCollapsed(!queueCollapsed)}
              >
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  {queueCollapsed ? <CaretDown size={20} /> : <CaretUp size={20} />}
                  📋 Pozostałe zadania na dziś ({queueTasks.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                W godzinach pracy • <span className="font-semibold">{queueTasks.reduce((sum, t) => sum + t.estimate_min, 0)} min</span> (est time)
              </p>
              
              {/* Task Cards - Compact Layout */}
              {!queueCollapsed && (
                <div className="space-y-2">
                  {queueTasks.map((task, idx) => (
                    <DayAssistantV2TaskCard
                      key={task.id}
                      task={task}
                      queuePosition={idx + TOP_TASKS_COUNT + 1}
                      isCompact={true}
                      onStartTimer={handleStartTimer}
                      onComplete={handleCompleteTask}
                      onHelp={handleHelp}
                      onPin={handlePinTask}
                      onPostpone={handlePostponeTask}
                      onDelete={handleDeleteTask}
                      onOpenDetails={handleOpenDetails}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overflow Section - Collapsible */}
          {overflowTasks.length > 0 && (
            <div className="mb-6">
              {/* Section Header - Collapsible */}
              <div
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => setOverflowCollapsed(!overflowCollapsed)}
              >
                <h3 className="text-base font-bold text-slate-600 flex items-center gap-2">
                  {overflowCollapsed ? <CaretDown size={20} /> : <CaretUp size={20} />}
                  📦 Zadania poza godzinami pracy ({overflowTasks.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Nie zmieszczą się dzisiaj • <span className="font-semibold">{overflowTasks.reduce((sum, t) => sum + t.estimate_min, 0)} min</span> (est time)
              </p>
              
              {/* Task Cards - Overflow Layout */}
              {!overflowCollapsed && (
                <div className="space-y-2">
                  {overflowTasks.map(task => (
                    <DayAssistantV2TaskCard
                      key={task.id}
                      task={task}
                      isOverflow={true}
                      onStartTimer={handleStartTimer}
                      onComplete={handleCompleteTask}
                      onHelp={handleHelp}
                      onPin={handlePinTask}
                      onPostpone={handlePostponeTask}
                      onDelete={handleDeleteTask}
                      onOpenDetails={handleOpenDetails}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Decision Log - Moved to bottom */}
          <div className="mb-6">
            <DecisionLogPanel
              decisions={decisions}
              onLogDecision={handleLogDecision}
            />
          </div>

          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarBlank size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold mb-2">Brak zadań na dziś</h3>
                <p className="text-gray-500 mb-4">
                  Dodaj pierwsze zadanie, aby rozpocząć dzień
                </p>
                <Button
                  onClick={() => {
                    setEditingTask(null)
                    setShowUniversalModal(true)
                  }}
                >
                  <Plus size={20} className="mr-2" />
                  Dodaj zadanie
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Removed for better space utilization */}
      </div>

      {/* Universal Task Modal */}
      <UniversalTaskModal
        open={showUniversalModal}
        onOpenChange={(open) => {
          setShowUniversalModal(open)
          if (!open) setEditingTask(null)
        }}
        task={editingTask ? {
          id: editingTask.id,
          content: editingTask.title,
          description: editingTask.description || '',
          due: editingTask.due_date || '',
          priority: validatePriority(editingTask.priority),
          estimated_minutes: editingTask.estimate_min,
          cognitive_load: editingTask.cognitive_load,
          labels: editingTask.tags || []
        } : null}
        defaultDate={selectedDate}
        onSave={handleTaskSave}
      />

      {/* Work Hours Modal */}
      <WorkHoursModal
        isOpen={showWorkHoursModal}
        currentStart={workHoursStart}
        currentEnd={workHoursEnd}
        onClose={() => setShowWorkHoursModal(false)}
        onSave={handleWorkHoursChange}
      />

      {/* Work Mode Modal */}
      <WorkModeModal
        isOpen={showWorkModeModal}
        onClose={() => setShowWorkModeModal(false)}
        currentMode={workMode}
        onSelect={handleWorkModeChange}
      />

      {/* Morning Review Modal */}
      <MorningReviewModal
        isOpen={showOverdueModal}
        onClose={() => setShowOverdueModal(false)}
        overdueTasks={overdueTasks}
        selectedDate={selectedDate}
        onAddToday={handleOverdueAddToday}
        onMoveToTomorrow={handleOverdueMoveToTomorrow}
        onReschedule={handleOverdueReschedule}
        onDelete={handleOverdueDelete}
        onComplete={handleOverdueComplete}
      />
    </div>
  )
}
