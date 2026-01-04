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
import { TestDayTask, DayPlan, Recommendation, WorkMode } from '@/lib/types/dayAssistantV2'
import { scoreAndSortTasksV3 } from '@/lib/services/dayAssistantV2RecommendationEngine'
import { calculateAvailableMinutes } from '@/hooks/useTaskQueue'
import { DayAssistantV2StatusBar } from './DayAssistantV2StatusBar'
import { DayAssistantV2FocusBar } from './DayAssistantV2FocusBar'
import { WorkHoursModal } from './WorkHoursModal'
import { WorkModeModal } from './WorkModeModal'
import { OverdueAlert } from './OverdueAlert'
import { MeetingsSection } from './MeetingsSection'
import { TodaysFlowPanel } from './TodaysFlowPanel'
import { DecisionLogPanel, Decision } from './DecisionLogPanel'
import { OverdueTasksSection } from './OverdueTasksSection'
import { DayAssistantV2TaskCard } from './DayAssistantV2TaskCard'
import { RecommendationPanel } from './RecommendationPanel'
import { ProjectFilter } from './ProjectFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTaskTimer } from '@/hooks/useTaskTimer'
import Button from '@/components/ui/Button'
import { Plus, CalendarBlank, CaretDown, CaretUp } from '@phosphor-icons/react'

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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
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
  const overdueRef = useRef<HTMLDivElement>(null)
  
  // Project filtering state
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  // Custom hooks
  const { activeTimer, startTimer, pauseTimer, resumeTimer, stopTimer, formatTime } = useTaskTimer()

  // Load data on mount
  useEffect(() => {
    loadData()
    
    // Listen for task-added events (from FloatingAddButton)
    const handleTaskAdded = () => {
      loadData()
    }
    window.addEventListener('task-added', handleTaskAdded)
    
    return () => {
      window.removeEventListener('task-added', handleTaskAdded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // loadData is intentionally omitted - it has internal state dependencies that would cause infinite re-renders
  }, [])
  
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
      
      // Fetch day plan with tasks
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
      setTasks(data.tasks || [])
      setAssistant(data.assistant)
      setTaskStats(data.taskStats || taskStats)
      if (data.dayPlan?.metadata?.work_start_time && isValidTimeFormat(data.dayPlan.metadata.work_start_time)) {
        setWorkHoursStart(data.dayPlan.metadata.work_start_time)
      }
      if (data.dayPlan?.metadata?.work_end_time && isValidTimeFormat(data.dayPlan.metadata.work_end_time)) {
        setWorkHoursEnd(data.dayPlan.metadata.work_end_time)
      }
      
      // Fetch recommendations
      await fetchRecommendations()
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Błąd podczas ładowania danych')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch(`/api/day-assistant-v2/recommend?date=${selectedDate}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch('/api/day-assistant-v2/complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: taskId })
      })
      
      if (!response.ok) throw new Error('Failed to complete task')
      
      toast.success('✅ Zadanie ukończone!')
      await loadData()
      
      // Stop timer if this task was active
      if (activeTimer?.taskId === taskId) {
        stopTimer()
      }
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Błąd podczas ukończania zadania')
    }
  }

  const handlePinTask = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const task = tasks.find(t => t.id === taskId)
      const newIsMust = !task?.is_must
      
      const response = await fetch('/api/day-assistant-v2/pin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: taskId, pin: newIsMust })
      })
      
      if (!response.ok) throw new Error('Failed to pin task')
      
      toast.success(newIsMust ? '📌 Przypięto do MUST' : '📌 Odpięto z MUST')
      await loadData()
    } catch (error) {
      console.error('Error pinning task:', error)
      toast.error('Błąd podczas przypinania zadania')
    }
  }

  const handlePostponeTask = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch('/api/day-assistant-v2/postpone', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: taskId })
      })
      
      if (!response.ok) throw new Error('Failed to postpone task')
      
      toast.success('📅 Zadanie przesunięte na jutro')
      await loadData()
    } catch (error) {
      console.error('Error postponing task:', error)
      toast.error('Błąd podczas przesuwania zadania')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch(`/api/day-assistant-v2/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to delete task')
      
      toast.success('🗑️ Zadanie usunięte')
      await loadData()
      
      // Stop timer if this task was active
      if (activeTimer?.taskId === taskId) {
        stopTimer()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Błąd podczas usuwania zadania')
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
      
      const payload = {
        title: taskData.content,
        description: taskData.description,
        estimate_min: taskData.estimated_minutes,
        cognitive_load: taskData.cognitive_load,
        due_date: taskData.due,
        priority: taskData.priority,
        tags: taskData.labels || []
      }
      
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
      await loadData()
    } catch (error) {
      console.error('Error saving task:', error)
      toast.error('Błąd podczas zapisywania zadania')
    }
  }

  const handleApplyRecommendation = async (rec: Recommendation) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch('/api/day-assistant-v2/apply-recommendation', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recommendationId: rec.id })
      })
      
      if (!response.ok) throw new Error('Failed to apply recommendation')
      
      toast.success('✅ Rekomendacja zastosowana')
      await loadData()
    } catch (error) {
      console.error('Error applying recommendation:', error)
      toast.error('Błąd podczas stosowania rekomendacji')
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
    // Scroll to overdue section
    overdueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleLogDecision = (text: string) => {
    const newDecision: Decision = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toISOString()
    }
    setDecisions(prev => [newDecision, ...prev])
    toast.success('✅ Decyzja zapisana')
  }

  const handleKeepOverdueToday = async (task: TestDayTask) => {
    // Just keep the due date as today - no API call needed for now
    toast.success(`📅 ${task.title} pozostaje na dziś`)
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
    
    // Calculate capacity using available minutes (considers if work hours have ended)
    // This returns 0 if current time is after work end time
    const capacityMinutes = calculateAvailableMinutes(workHoursEnd, 0)
    
    // If no capacity available (work hours ended), move all today tasks to overflow
    if (capacityMinutes <= 0) {
      console.log('⚠️ [DayAssistantV2] No capacity available - work hours have ended')
      
      // All today tasks go to overflow
      sections.overflowTasks.push(...todayNonMustTasks)
      
      // Tasks without due date or future dates also go to overflow
      const futureTasks = scoredTasks.filter(t =>
        !t.completed &&
        !t.is_must &&
        !(t.due_date && t.due_date < selectedDate) &&
        (!t.due_date || t.due_date > selectedDate)
      )
      sections.overflowTasks.push(...futureTasks)
      
      console.log('📊 [DayAssistantV2] Final sections (after work hours):', {
        must: sections.mustTasks.length,
        top3: 0,
        queue: 0,
        overflow: sections.overflowTasks.length,
        overdue: sections.overdueTasks.length,
        remainingCapacity: 0
      })
      
      return sections
    }
    
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
      remaining: remainingCapacity,
      todayTasksCount: todayNonMustTasks.length
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
    
    console.log('📊 [DayAssistantV2] Final sections:', {
      must: sections.mustTasks.length,
      top3: sections.top3Tasks.length,
      queue: sections.queueTasks.length,
      overflow: sections.overflowTasks.length,
      overdue: sections.overdueTasks.length,
      remainingCapacity: remainingCapacity
    })
    
    return sections
  }, [scoredTasks, selectedDate, workHoursEnd])

  // Calculate time stats
  const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimate_min || 0), 0)
  const completedMinutes = tasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + (t.estimate_min || 0), 0)
  
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
        <div className="sticky top-0 z-50 bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-6 px-6">
          <DayAssistantV2FocusBar
            task={tasks.find(t => t.id === activeTimer.taskId) || null}
            elapsedSeconds={activeTimer.elapsedSeconds}
            isPaused={activeTimer.isPaused || false}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onComplete={() => handleCompleteTask(activeTimer.taskId)}
            onStop={stopTimer}
          />
        </div>
      )}

      {/* Status Bar - ALWAYS VISIBLE */}
      <div className={`${activeTimer ? '' : 'sticky top-0 z-40'} bg-gradient-to-br from-purple-50 via-white to-pink-50 px-6 ${activeTimer ? 'pt-0' : 'pt-6'}`}>
        <DayAssistantV2StatusBar
          workHoursStart={workHoursStart}
          workHoursEnd={workHoursEnd}
          workMode={workMode}
          usedMinutes={scheduledMinutes}
          totalCapacity={availableMinutes}
          onEditWorkHours={() => setShowWorkHoursModal(true)}
          onEditMode={() => setShowWorkModeModal(true)}
        />
      </div>

      {/* Overdue Alert Banner */}
      <OverdueAlert 
        overdueCount={overdueTasks.length}
        onReview={handleReviewOverdue}
      />

      {/* Main Layout: Content + Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          
          {/* Meetings Section */}
          <MeetingsSection
            meetings={meetings}
            onRefresh={handleRefreshMeetings}
          />
          
          {/* Project Filter */}
          {projects.length > 0 && (
            <ProjectFilter
              projects={projects}
              selectedProjectId={selectedProjectId}
              onChange={setSelectedProjectId}
              loading={loadingProjects}
            />
          )}

          {/* Overdue Tasks Section */}
          {overdueTasks.length > 0 && (
            <div ref={overdueRef} className="mb-6">
              <OverdueTasksSection
                overdueTasks={overdueTasks}
                selectedDate={selectedDate}
                onComplete={(task) => handleCompleteTask(task.id)}
                onKeepToday={handleKeepOverdueToday}
                onPostpone={(task) => handlePostponeTask(task.id)}
              />
            </div>
          )}

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

        {/* Right Sidebar */}
        <div className="w-full lg:w-80 space-y-4 lg:space-y-6">
          
          {/* Today's Flow Panel */}
          <TodaysFlowPanel
            completedCount={taskStats.completedToday}
            presentedCount={0} // Placeholder
            addedCount={taskStats.addedToday}
            workTimeMinutes={completedMinutes}
          />

          {/* Decision Log Panel */}
          <DecisionLogPanel
            decisions={decisions}
            onLogDecision={handleLogDecision}
          />

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                🤖 AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <RecommendationPanel
                recommendations={recommendations}
                onApply={handleApplyRecommendation}
              />
            </CardContent>
          </Card>
        </div>
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
    </div>
  )
}
