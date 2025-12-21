'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { Plus, List, Kanban, CalendarBlank, Calendar, SortAscending, Timer as TimerIcon, CheckSquare, Trash, ArrowRight } from '@phosphor-icons/react'
import { startOfDay, addDays, parseISO, isSameDay, isBefore, isWithinInterval, format, subDays, startOfMonth, endOfMonth, isAfter } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailsModal } from './TaskDetailsModal'
import { TaskCard } from './TaskCard'
import { SevenDaysBoardView } from './SevenDaysBoardView'
import { MonthView } from './MonthView'
import { TaskTimer } from './TaskTimer'
import { PomodoroTimer } from './PomodoroTimer'
import { supabase } from '@/lib/supabaseClient'
import { getTodoistToken } from '@/lib/integrations'
import { syncTodoist, startBackgroundSync } from '@/lib/todoistSync'

interface Task {
  id: string
  content: string
  description?:  string
  project_id?:  string
  priority:  1 | 2 | 3 | 4
  due?:  { date: string } | string
  completed?: boolean
  created_at?: string
  completed_at?: string // Timestamp when task was completed (from Todoist API)
  subtasks?: any[]
  duration?: number
  labels?: string[]
}

interface Project {
  id: string
  name: string
  color?:  string
}

type FilterType = 'today' | 'tomorrow' | 'week' | 'month' | 'all' | 'completed' | 'scheduled'
type ViewType = 'list' | 'board'
type SortType = 'date' | 'priority' | 'name'
type GroupByType = 'none' | 'day' | 'project' | 'priority'
type CompletedTimeFilter = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom'
const OVERDUE_PREVIEW_LIMIT = 3

const getDueDateString = (task: Task) => (typeof task.due === 'string' ? task.due : task.due?.date || null)

const parseDueDateString = (dueStr: string | null) => {
  if (!dueStr) return null
  try {
    return parseISO(dueStr)
  } catch {
    return null
  }
}

const formatDueDate = (task: Task) => {
  const dueStr = getDueDateString(task)
  
  if (!dueStr) return 'Brak daty'
  
  const parsedDue = parseDueDateString(dueStr)
  if (!parsedDue) return dueStr
  
  try {
    return format(parsedDue, 'd MMM yyyy', { locale: pl })
  } catch {
    return dueStr
  }
}

/**
 * Formats elapsed time in seconds to HH:MM:SS format
 * @param seconds - Total elapsed seconds
 * @returns Formatted time string in HH:MM:SS format
 */
const formatElapsedTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Calculates elapsed time from a start timestamp
 * @param startTime - Start timestamp in milliseconds
 * @returns Elapsed seconds
 */
const calculateElapsedSeconds = (startTime: number): number => {
  const now = Date.now()
  return Math.floor((now - startTime) / 1000)
}

/**
 * Checks if a date is within the last N days
 * @param date - Date to check
 * @param days - Number of days to check
 * @param referenceDate - Reference date (default: today)
 * @returns True if date is within the last N days
 */
const isWithinLastNDays = (date: Date, days: number, referenceDate: Date): boolean => {
  return isAfter(date, subDays(referenceDate, days)) || isSameDay(date, subDays(referenceDate, days))
}

const isTaskOverdue = (task: Task, referenceDay: Date): boolean => {
  const dueDate = parseDueDateString(getDueDateString(task))
  if (!dueDate) return false
  return isBefore(startOfDay(dueDate), referenceDay)
}

export function TasksAssistant() {
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewType>('list')
  // Default filter: 'today' shows only tasks with due date = today
  // Change to 'all' to include tasks without due dates by default
  const [filter, setFilter] = useState<FilterType>('today')
  const [sortBy, setSortBy] = useState<SortType>('date')
  const [groupBy, setGroupBy] = useState<GroupByType>('none')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [activeTimerInfo, setActiveTimerInfo] = useState<{ taskId: string; taskTitle: string; isActive: boolean; elapsedSeconds?: number; startTime?: number } | null>(null)
  const [completedTimeFilter, setCompletedTimeFilter] = useState<CompletedTimeFilter>('last7days')
  const [token, setToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showOverduePreview, setShowOverduePreview] = useState(false)

  // Fetch Todoist token from database (single source of truth)
  useEffect(() => {
    const fetchTokenFromDB = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.warn('[TasksAssistant] No authenticated user')
          return
        }

        setUserId(user.id)
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[TasksAssistant] Fetching Todoist token for user: ${user.id.substring(0, 8)}...`)
        }

        const todoistToken = await getTodoistToken(user.id)
        
        if (todoistToken) {
          setToken(todoistToken)
          if (process.env.NODE_ENV === 'development') {
            console.log('[TasksAssistant] ✓ Todoist token found')
          }
        } else {
          console.log('[TasksAssistant] ✗ No Todoist token - user needs to connect')
        }
      } catch (error) {
        console.error('[TasksAssistant] Error fetching token:', error)
      }
    }

    fetchTokenFromDB()
  }, [])
  
  const fetchTasks = useCallback(async (filterType: FilterType) => {
    setLoading(true)
    try {
      console.log('🔍 Fetching tasks with token:', token ?  'EXISTS' : 'MISSING')
      
      // ✨ STEP 1: Call sync (cache-aware, coordinated)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await syncTodoist(session.access_token)
          .catch(err => console.warn('[TasksAssistant] Sync warning:', err))
      }
      
      // ✨ STEP 2: Fetch from Todoist API (already synchronized)
      const res = await fetch(`/api/todoist/tasks?token=${token}&filter=${filterType}`)
      
      console.log('📡 Response status:', res.status)
      
      if (!res.ok) throw new Error('Failed to fetch tasks')
      
      const data = await res. json()
      console.log('📦 Raw data from API:', data)
      
      const fetchedTasks = data.tasks || data || []
      console.log('📋 Fetched tasks count:', fetchedTasks.length)
      
      // Map tasks with parsed due dates
      const mapped = fetchedTasks.map((t: any) => ({
        ...t,
        _dueYmd: typeof t.due === 'string' ? t.due : t.due?.date || null
      }))
      
      console.log('✅ Mapped tasks:', mapped)
      console.log('🎯 First task example:', mapped[0])
      
      setTasks(mapped)
    } catch (err) {
      console.error('❌ Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [token])
  
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/todoist/projects?token=${token}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || data || [])
      } else {
        showToast('Nie udało się pobrać projektów z Todoist', 'error')
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
      showToast('Błąd przy pobieraniu projektów', 'error')
    }
  }, [showToast, token])
  
  // Fetch tasks on mount and when filter or token changes
  useEffect(() => {
    if (! token) return
    fetchTasks(filter)
    
    // Poll every 45 seconds - always use current filter
    const interval = setInterval(() => {
      fetchTasks(filter)
    }, 45000)
    
    return () => clearInterval(interval)
  }, [token, filter, fetchTasks])
  
  // Fetch projects
  useEffect(() => {
    if (!token) return
    fetchProjects()
  }, [token, fetchProjects])
  
  // Background sync every 10 seconds (coordinated globally)
  useEffect(() => {
    if (!token) return
    
    let cleanup: (() => void) | null = null
    
    // Get session token and start background sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        cleanup = startBackgroundSync(session.access_token, 10000)
      }
    })
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [token])
  
  // Monitor active timer/pomodoro
  useEffect(() => {
    const checkActiveTimer = () => {
      // Check regular task timer
      const taskTimerStored = localStorage.getItem('taskTimer')
      if (taskTimerStored) {
        const parsed = JSON.parse(taskTimerStored)
        if (parsed.taskId && (parsed.isRunning || parsed.isPaused)) {
          // Calculate elapsed time
          const elapsed = parsed.isRunning && parsed.startTime 
            ? calculateElapsedSeconds(parsed.startTime)
            : parsed.elapsedSeconds || 0
          
          setActiveTimerInfo({
            taskId: parsed.taskId,
            taskTitle: parsed.taskTitle,
            isActive: true,
            elapsedSeconds: elapsed,
            startTime: parsed.startTime
          })
          return
        }
      }
      
      // Check pomodoro timer
      const pomodoroStored = localStorage.getItem('pomodoroState')
      if (pomodoroStored) {
        const parsed = JSON.parse(pomodoroStored)
        if (parsed.taskId && parsed.isRunning) {
          setActiveTimerInfo({
            taskId: parsed.taskId,
            taskTitle: parsed.taskTitle,
            isActive: true
          })
          return
        }
      }
      
      setActiveTimerInfo(null)
    }
    
    checkActiveTimer()
    
    // Update timer every second
    const interval = setInterval(checkActiveTimer, 1000)
    
    // Listen for timer state changes
    const handleStorageChange = () => checkActiveTimer()
    const handleTimerChange = () => checkActiveTimer()
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('timerStateChanged', handleTimerChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('timerStateChanged', handleTimerChange)
      clearInterval(interval)
    }
  }, [])
  
  // Filter tasks by date
  const filterTasks = useCallback((tasks: Task[], filterType: FilterType) => {
    console.log('🔍 FILTER DEBUG:', {
      totalTasks: tasks.length,
      filterType,
      tasks:  tasks.map(t => ({
        id: t.id,
        content: t.content,
        due: t.due,
        completed: t.completed
      }))
    })
    
    const now = startOfDay(new Date())
    
    const filtered = tasks.filter(task => {
      // Show only completed tasks when filter is 'completed'
      if (filterType === 'completed') {
        if (task.completed !== true) return false
        
        // Apply time-based filtering for completed tasks
        // Use completed_at if available, fallback to created_at
        const completedAtStr = task.completed_at || task.created_at
        if (!completedAtStr) return true // If no timestamp, show it
        
        const completedDate = startOfDay(parseISO(completedAtStr))
        
        switch (completedTimeFilter) {
          case 'today':
            return isSameDay(completedDate, now)
          case 'yesterday':
            return isSameDay(completedDate, subDays(now, 1))
          case 'last7days':
            return isWithinLastNDays(completedDate, 7, now)
          case 'last30days':
            return isWithinLastNDays(completedDate, 30, now)
          case 'thisMonth':
            return isWithinInterval(completedDate, {
              start: startOfMonth(now),
              end: endOfMonth(now)
            })
          default:
            return true
        }
      }
      
      // Skip completed tasks for other filters
      if (task.completed) {
        console.log('⏭️ Skipping completed task:', task.content)
        return false
      }
      
      const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
      
      if (filterType === 'all') return true
      
      // Show overdue and undated tasks for 'scheduled' filter
      if (filterType === 'scheduled') {
        if (!dueStr) return true
        return isTaskOverdue(task, now)
      }
      
      if (! dueStr) {
        console.log('⏭️ Skipping task without due date:', task.content)
        return false
      }
      
      try {
        const dueDate = startOfDay(parseISO(dueStr))
        
        console.log('📅 Checking task:', {
          content:  task.content,
          dueStr,
          dueDate,
          now,
          filterType
        })
        
        switch (filterType) {
          case 'today':
            const isToday = isSameDay(dueDate, now)
            console.log('  → isToday:', isToday)
            return isToday
          case 'tomorrow':
            const isTomorrow = isSameDay(dueDate, addDays(now, 1))
            console.log('  → isTomorrow:', isTomorrow)
            return isTomorrow
          case 'week':  
            const isInWeek = isWithinInterval(dueDate, { 
              start:  now, 
              end: addDays(now, 6) 
            })
            console. log('  → isInWeek:', isInWeek)
            return isInWeek
          case 'month':  
            const isInMonth = isWithinInterval(dueDate, { 
              start: now, 
              end: addDays(now, 29) 
            })
            console.log('  → isInMonth:', isInMonth)
            return isInMonth
          default:
            return true
        }
      } catch (err) {
        console.error('❌ Error parsing date for task:', task.content, err)
        return false
      }
    })
    
    console.log('✅ Filtered tasks result:', filtered.length, filtered)
    return filtered
  }, [completedTimeFilter])
  
  // Filter by project
  const filterByProject = (tasks: Task[]) => {
    if (selectedProject === 'all') return tasks
    return tasks.filter(t => t.project_id === selectedProject)
  }
  
  // Sort tasks
  const sortTasks = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'priority') {
        return a.priority - b.priority
      }
      
      if (sortBy === 'name') {
        return a. content.localeCompare(b.content)
      }
      
      // sortBy === 'date'
      const aDate = typeof a.due === 'string' ? a.due : a.due?.date
      const bDate = typeof b.due === 'string' ?  b.due : b.due?. date
      
      if (! aDate) return 1
      if (!bDate) return -1
      
      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })
  }
  
  // Apply all filters
  const overdueTasks = useMemo(() => {
    const now = startOfDay(new Date())
    
    return tasks.filter(task => !task.completed && isTaskOverdue(task, now))
  }, [tasks])
  let filteredTasks = filterTasks(tasks, filter)
  filteredTasks = filterByProject(filteredTasks)
  const sortedTasks = sortTasks(filteredTasks)
  const isScheduledFilter = filter === 'scheduled'
  const scheduledOverdueTasks = useMemo(() => {
    if (!isScheduledFilter) return []
    
    const todayStart = startOfDay(new Date())
    return sortedTasks.filter(task => isTaskOverdue(task, todayStart))
  }, [isScheduledFilter, sortedTasks])
  const scheduledUndatedTasks = useMemo(() => {
    if (!isScheduledFilter) return []
    return sortedTasks.filter(task => !getDueDateString(task))
  }, [isScheduledFilter, sortedTasks])
  
  // Group tasks
  const groupTasks = (tasks: Task[]) => {
    if (groupBy === 'none') {
      return { 'all': tasks }
    }
    
    const groups: Record<string, Task[]> = {}
    
    tasks.forEach(task => {
      let groupKey = ''
      
      if (groupBy === 'day') {
        const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
        if (dueStr) {
          try {
            groupKey = format(parseISO(dueStr), 'EEEE, d MMMM yyyy', { locale: pl })
          } catch {
            groupKey = 'Bez daty'
          }
        } else {
          groupKey = 'Bez daty'
        }
      } else if (groupBy === 'project') {
        const project = projects.find(p => p.id === task.project_id)
        groupKey = project ? project.name : 'Bez projektu'
      } else if (groupBy === 'priority') {
        const priorityLabels = {
          1: 'P1 - Wysoki',
          2: 'P2 - Średni',
          3: 'P3 - Niski',
          4: 'P4 - Brak'
        }
        groupKey = priorityLabels[task.priority] || 'P4 - Brak'
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(task)
    })
    
    return groups
  }
  
  const groupedTasks = groupTasks(sortedTasks)
  
  // Non-completed tasks for board/week/month views (respecting project filter)
  let activeTasks = tasks.filter(t => !t.completed)
  activeTasks = filterByProject(activeTasks)
  
  console.log('🎯 FINAL SORTED TASKS:', sortedTasks)
  
  // Track task analytics
  interface TaskAnalyticsData {
    task_id: string
    task_title: string
    task_project?: string | null
    task_labels?: string[]
    priority?: number
    estimated_duration?: number
    actual_duration?: number
    due_date?: string | null
    completed_date?: string
    action_type: 'created' | 'completed' | 'postponed' | 'deleted'
    postponed_from?: string
    postponed_to?: string
    completion_speed?: 'early' | 'on-time' | 'late' | null
    metadata?: Record<string, any>
  }

  const trackTaskAnalytics = async (analyticsData: TaskAnalyticsData) => {
    try {
      await fetch('/api/analytics/track-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || 'anonymous',
          ...analyticsData
        })
      })
    } catch (err) {
      console.error('Error tracking analytics:', err)
      // Don't throw - analytics should not break main functionality
    }
  }

  // Handlers
  const handleAddTask = async (taskData: any) => {
    try {
      console.log('➕ Creating task:', taskData)
      
      const res = await fetch('/api/todoist/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error?.error || 'Failed to create task')
      }
      
      const data = await res.json()
      const newTask = data.task || data
      
      console.log('✅ Task created:', newTask)
      
      setTasks(prev => [newTask, ...prev])
      showToast('Zadanie zostało utworzone', 'success')
      
      // Track analytics
      trackTaskAnalytics({
        task_id: newTask.id,
        task_title: newTask.content,
        task_project: taskData.project_id || null,
        task_labels: taskData.labels || [],
        priority: taskData.priority || 4,
        estimated_duration: taskData.duration || null,
        due_date: taskData.due_date || null,
        action_type: 'created'
      })
      
      // Refresh tasks to get updated list
      setTimeout(() => fetchTasks(filter), 500)
      
    } catch (err: any) {
      console.error('❌ Error creating task:', err)
      showToast('Nie udało się utworzyć zadania: ' + (err?.message || ''), 'error')
    }
  }
  
  const handleComplete = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      
      const res = await fetch('/api/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, token })
      })
      
      if (!res.ok) throw new Error('Failed to complete task')
      
      setTasks(prev => prev.filter(t => t.id !== taskId))
      showToast('Zadanie ukończone!', 'success')
      
      // Track analytics
      if (task) {
        const dueDate = typeof task.due === 'string' ? task.due : task.due?.date
        const today = new Date().toISOString().split('T')[0]
        let completionSpeed: 'early' | 'on-time' | 'late' | null = null
        
        if (dueDate) {
          if (dueDate > today) completionSpeed = 'early'
          else if (dueDate === today) completionSpeed = 'on-time'
          else completionSpeed = 'late'
        }
        
        trackTaskAnalytics({
          task_id: taskId,
          task_title: task.content,
          task_project: task.project_id || null,
          task_labels: task.labels || [],
          priority: task.priority || 4,
          due_date: dueDate || null,
          completed_date: new Date().toISOString(),
          action_type: 'completed',
          completion_speed: completionSpeed
        })
      }
      
      console.log('✅ Zadanie ukończone!')
    } catch (err) {
      console.error('Error completing task:', err)
      showToast('Nie udało się ukończyć zadania', 'error')
    }
  }
  
  const handleDelete = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      
      const res = await fetch('/api/todoist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, token })
      })
      
      if (!res.ok) throw new Error('Failed to delete task')
      
      setTasks(prev => prev.filter(t => t.id !== taskId))
      showToast('Zadanie usunięte', 'success')
      
      // Track analytics
      if (task) {
        const dueDate = typeof task.due === 'string' ? task.due : task.due?.date
        trackTaskAnalytics({
          task_id: taskId,
          task_title: task.content,
          task_project: task.project_id || null,
          task_labels: task.labels || [],
          priority: task.priority || 4,
          due_date: dueDate || null,
          action_type: 'deleted'
        })
      }
      
      console.log('🗑️ Zadanie usunięte!')
    } catch (err) {
      console.error('Error deleting task:', err)
      showToast('Nie udało się usunąć zadania', 'error')
    }
  }
  
  const handleUpdate = async (taskId: string, updates: Partial<Task>, showToastMsg: boolean = true) => {
    try {
      const res = await fetch('/api/todoist/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, token, ...updates })
      })
      
      if (!res.ok) throw new Error('Failed to update task')
      
      const data = await res.json()
      const updatedTask = data.task || data
      
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, ...updatedTask } : t
      ))
      
      if (showToastMsg) {
        showToast('Zadanie zaktualizowane', 'success')
      }
      
      console.log('💾 Zadanie zaktualizowane!')
    } catch (err) {
      console.error('Error updating task:', err)
      if (showToastMsg) {
        showToast('Nie udało się zaktualizować zadania', 'error')
      }
      throw err
    }
  }
  
  const handleMove = async (taskId: string, newDate: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      const oldDate = task ? (typeof task.due === 'string' ? task.due : task.due?.date) : null
      
      await handleUpdate(taskId, { due: newDate }, false)
      showToast('Zadanie przeniesione', 'success')
      
      // Track analytics for postponement
      if (task && oldDate && oldDate !== newDate) {
        trackTaskAnalytics({
          task_id: taskId,
          task_title: task.content,
          task_project: task.project_id || null,
          task_labels: task.labels || [],
          priority: task.priority || 4,
          action_type: 'postponed',
          postponed_from: oldDate,
          postponed_to: newDate
        })
      }
    } catch (err) {
      console.error('Error moving task:', err)
      showToast('Nie udało się przenieść zadania', 'error')
      throw err
    }
  }
  
  const handleDuplicate = async (task: Task) => {
    try {
      const taskData = {
        content: `${task.content} (kopia)`,
        description: task.description,
        due_date: typeof task.due === 'string' ? task.due : task.due?.date,
        priority: task.priority,
        project_id: task.project_id,
        labels: task.labels,
        token
      }
      
      await handleAddTask(taskData)
      showToast('Zadanie zduplikowane', 'success')
      
      console.log('📋 Zadanie zduplikowane!')
    } catch (err) {
      console.error('Error duplicating task:', err)
      showToast('Nie udało się zduplikować zadania', 'error')
      throw err
    }
  }
  
  // Bulk action handlers
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }
  
  const toggleAllTasksSelection = () => {
    if (selectedTaskIds.size === sortedTasks.length) {
      setSelectedTaskIds(new Set())
    } else {
      setSelectedTaskIds(new Set(sortedTasks.map(t => t.id)))
    }
  }

  const renderTaskCards = (list: Task[]) => (
    <div className="space-y-3">
      {list.map(task => (
        <TaskCard 
          key={task.id}
          task={task}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onDetails={(t) => {
            setSelectedTask(t)
            setShowDetailsModal(true)
          }}
          selectable={selectedTaskIds.size > 0}
          selected={selectedTaskIds.has(task.id)}
          onToggleSelection={toggleTaskSelection}
        />
      ))}
    </div>
  )
  
  const handleBulkComplete = async () => {
    if (selectedTaskIds.size === 0) return
    
    const confirmed = confirm(`Czy na pewno chcesz ukończyć ${selectedTaskIds.size} zadań?`)
    if (!confirmed) return
    
    setBulkActionLoading(true)
    const count = selectedTaskIds.size
    
    // Execute all complete operations (individual toasts will show for any errors)
    for (const taskId of selectedTaskIds) {
      await handleComplete(taskId)
    }
    
    setBulkActionLoading(false)
    setSelectedTaskIds(new Set())
    showToast(`Przetworzono ${count} zadań`, 'success')
  }
  
  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return
    
    const confirmed = confirm(`Czy na pewno chcesz usunąć ${selectedTaskIds.size} zadań?`)
    if (!confirmed) return
    
    setBulkActionLoading(true)
    const count = selectedTaskIds.size
    
    // Execute all delete operations (individual toasts will show for any errors)
    for (const taskId of selectedTaskIds) {
      await handleDelete(taskId)
    }
    
    setBulkActionLoading(false)
    setSelectedTaskIds(new Set())
    showToast(`Przetworzono ${count} zadań`, 'success')
  }
  
  const handleBulkMove = async (newDate: string) => {
    if (selectedTaskIds.size === 0) return
    
    setBulkActionLoading(true)
    const count = selectedTaskIds.size
    
    // Execute all move operations (individual toasts will show for any errors)
    for (const taskId of selectedTaskIds) {
      try {
        await handleMove(taskId, newDate)
      } catch (err) {
        console.error(`Error moving task ${taskId}:`, err)
      }
    }
    
    setBulkActionLoading(false)
    setSelectedTaskIds(new Set())
    showToast(`Przetworzono ${count} zadań`, 'success')
  }
  
  // OAuth Connection Screen
  if (! token) {
    const handleOAuthConnect = () => {
      // Redirect to our API endpoint which handles OAuth properly
      window.location.href = '/api/todoist/auth'
    }
    
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Zarządzanie Zadaniami</h1>
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-purple/10 to-brand-pink/10 flex items-center justify-center mb-4">
            <CalendarBlank size={32} className="text-brand-purple" />
          </div>
          <h2 className="text-xl font-semibold">Połącz się z Todoist</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Aby zarządzać zadaniami, połącz swoje konto Todoist z aplikacją
          </p>
          <Button 
            onClick={handleOAuthConnect}
            className="gap-2 mt-4"
            size="lg"
          >
            <Plus size={20} />
            Połącz z Todoist
          </Button>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Active Timer Bar */}
      {activeTimerInfo && activeTimerInfo.isActive && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-3 h-3 bg-white rounded-full animate-ping" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Timer aktywny</p>
                <p className="text-xs opacity-90 truncate">{activeTimerInfo.taskTitle}</p>
              </div>
            </div>
            
            {/* Elapsed Time */}
            {activeTimerInfo.elapsedSeconds !== undefined && (
              <div className="text-right">
                <p className="text-xs opacity-75">Czas</p>
                <p className="text-lg font-mono font-bold">
                  {formatElapsedTime(activeTimerInfo.elapsedSeconds)}
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost"
                className="text-white hover:bg-white/20 whitespace-nowrap"
                onClick={() => {
                  const task = tasks.find(t => t.id === activeTimerInfo.taskId)
                  if (task) {
                    setSelectedTask(task)
                    setShowDetailsModal(true)
                  }
                }}
              >
                Zobacz zadanie
              </Button>
              
              <Button 
                size="sm" 
                variant="ghost"
                className="text-white hover:bg-red-700"
                onClick={() => {
                  // Stop the timer
                  const timerState = {
                    taskId: null,
                    taskTitle: null,
                    startTime: null,
                    elapsedSeconds: 0,
                    isRunning: false,
                    isPaused: false
                  }
                  localStorage.setItem('taskTimer', JSON.stringify(timerState))
                  window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: timerState }))
                  setActiveTimerInfo(null)
                }}
              >
                Zatrzymaj
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
              Zarządzanie Zadaniami
            </h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base lg:text-lg">Organizuj swoje zadania efektywnie</p>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="gap-2 bg-gradient-to-r from-brand-purple to-brand-pink hover:shadow-lg transition-all hover:scale-105"
              size="md"
            >
              <Plus size={18} weight="bold" />
              <span className="hidden sm:inline">Dodaj zadanie</span>
              <span className="sm:hidden">Dodaj</span>
            </Button>
          </div>
        </div>
        
        {/* Control Bar */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 md:gap-4">
            {/* View switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-medium text-gray-700 hidden sm:inline">Widok:</span>
              <div className="inline-flex rounded-lg md:rounded-xl border-2 border-gray-200 p-1 bg-gray-50">
                <button 
                  onClick={() => setView('list')}
                  className={`px-2 md:px-3 py-1.5 md:py-2 rounded-md md:rounded-lg transition-all flex items-center gap-1.5 md:gap-2 font-medium text-xs md:text-sm ${
                    view === 'list' 
                      ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md' 
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`}
                  title="Widok listy"
                >
                  <List size={16} weight="bold" className="md:hidden" />
                  <List size={18} weight="bold" className="hidden md:inline" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
                <button 
                  onClick={() => setView('board')}
                  className={`px-2 md:px-3 py-1.5 md:py-2 rounded-md md:rounded-lg transition-all flex items-center gap-1.5 md:gap-2 font-medium text-xs md:text-sm ${
                    view === 'board' 
                      ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md' 
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`}
                  title="Widok tablicy"
                >
                  <Kanban size={16} weight="bold" className="md:hidden" />
                  <Kanban size={18} weight="bold" className="hidden md:inline" />
                  <span className="hidden sm:inline">Tablica</span>
                </button>
              </div>
            </div>
            
            <div className="h-8 w-px bg-gray-300 hidden lg:block" />
            
            {/* Filters */}
            <div className="hidden md:flex items-stretch md:items-center gap-2 md:gap-3 flex-1">
              <div className="flex items-center gap-2 flex-1 min-w-0 md:min-w-[160px]">
                <SortAscending size={18} className="text-gray-500 hidden sm:inline flex-shrink-0" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="flex-1 px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-200 rounded-lg md:rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-xs md:text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  <option value="date">📅 Sortuj: Data</option>
                  <option value="priority">🚩 Sortuj: Priorytet</option>
                  <option value="name">🔤 Sortuj: Nazwa</option>
                </select>
              </div>
              
              {view === 'list' && (
                <div className="flex items-center gap-2 flex-1 min-w-0 md:min-w-[160px]">
                  <select 
                    value={groupBy} 
                    onChange={(e) => setGroupBy(e.target.value as GroupByType)}
                    className="flex-1 px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-200 rounded-lg md:rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-xs md:text-sm font-medium hover:border-gray-300 transition-colors"
                  >
                    <option value="none">📋 Grupuj: Brak</option>
                    <option value="day">📅 Grupuj: Dzień</option>
                    <option value="project">📁 Grupuj: Projekt</option>
                    <option value="priority">🚩 Grupuj: Priorytet</option>
                  </select>
                </div>
              )}
              
              <div className="flex items-center gap-2 flex-1 min-w-0 md:min-w-[160px]">
                <select 
                  value={selectedProject} 
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="flex-1 px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-200 rounded-lg md:rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-xs md:text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  <option value="all">📁 Wszystkie projekty</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex md:hidden flex-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-center gap-2"
                onClick={() => setShowMobileFilters((prev) => !prev)}
              >
                <SortAscending size={16} className="text-gray-600" />
                <span className="text-sm font-medium">{showMobileFilters ? 'Ukryj filtry' : 'Pokaż filtry'}</span>
              </Button>
            </div>
            
            <div className="h-8 w-px bg-gray-300 hidden lg:block" />
            
            {/* Task count badge */}
            <Badge variant="secondary" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 font-semibold whitespace-nowrap self-start md:self-auto">
              {sortedTasks.length} {sortedTasks.length === 1 ? 'zadanie' : 'zadań'}
            </Badge>
          </div>

          {showMobileFilters && (
            <div className="md:hidden mt-3 grid grid-cols-1 gap-2">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-sm font-medium hover:border-gray-300 transition-colors"
              >
                <option value="date">📅 Sortuj: Data</option>
                <option value="priority">🚩 Sortuj: Priorytet</option>
                <option value="name">🔤 Sortuj: Nazwa</option>
              </select>

              {view === 'list' && (
                <select 
                  value={groupBy} 
                  onChange={(e) => setGroupBy(e.target.value as GroupByType)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  <option value="none">📋 Grupuj: Brak</option>
                  <option value="day">📅 Grupuj: Dzień</option>
                  <option value="project">📁 Grupuj: Projekt</option>
                  <option value="priority">🚩 Grupuj: Priorytet</option>
                </select>
              )}

              <select 
                value={selectedProject} 
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-sm font-medium hover:border-gray-300 transition-colors"
              >
                <option value="all">📁 Wszystkie projekty</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Filters */}
      {view === 'list' && (
        <>
          {/* Desktop: Tabs */}
          <div className="hidden md:block">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              {/* 6 tabs: today, tomorrow, week, month, scheduled, completed */}
              <TabsList className="grid grid-cols-6 w-full gap-1">
                <TabsTrigger value="today" className="text-sm py-2">Dziś</TabsTrigger>
                <TabsTrigger value="tomorrow" className="text-sm py-2">Jutro</TabsTrigger>
                <TabsTrigger value="week" className="text-sm py-2">Tydzień</TabsTrigger>
                <TabsTrigger value="month" className="text-sm py-2">Miesiąc</TabsTrigger>
                <TabsTrigger value="scheduled" className="text-sm py-2">Do zaplanowania</TabsTrigger>
                <TabsTrigger value="completed" className="text-sm py-2">Ukończone</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Mobile: Dropdown */}
          <div className="md:hidden">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-sm font-medium hover:border-gray-300 transition-colors"
            >
              <option value="today">📅 Dziś</option>
              <option value="tomorrow">📅 Jutro</option>
              <option value="week">📅 Tydzień</option>
              <option value="month">📅 Miesiąc</option>
              <option value="scheduled">📋 Do zaplanowania</option>
              <option value="completed">✅ Ukończone</option>
            </select>
          </div>
          
          {/* Overdue hint inside Today view */}
          {filter === 'today' && overdueTasks.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm md:text-base font-semibold text-amber-900">
                    Masz {overdueTasks.length} przeterminowanych {overdueTasks.length === 1 ? 'zadanie' : 'zadań'} do nadrobienia
                  </p>
                  <p className="text-xs md:text-sm text-amber-800">
                    Zajmij się nimi w pierwszej kolejności, aby odblokować dzisiejsze plany.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-200 text-amber-900 hover:bg-amber-100"
                    onClick={() => setShowOverduePreview((prev) => !prev)}
                  >
                    {showOverduePreview ? 'Ukryj podgląd' : 'Pokaż podgląd'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-900 hover:bg-amber-100"
                    onClick={() => setFilter('scheduled')}
                  >
                    Przejdź do listy
                  </Button>
                </div>
              </div>

              {showOverduePreview && (
                <div className="mt-3 space-y-2">
                  {overdueTasks.slice(0, OVERDUE_PREVIEW_LIMIT).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-2 bg-white border border-amber-100 rounded-md px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 truncate">{task.content}</span>
                        <span className="text-xs text-amber-800">Termin: {formatDueDate(task)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-900 hover:bg-amber-100"
                        onClick={() => setFilter('scheduled')}
                        aria-label="Przejdź do listy zadań do zaplanowania"
                      >
                        <ArrowRight size={14} weight="bold" />
                      </Button>
                    </div>
                  ))}

                  {overdueTasks.length > OVERDUE_PREVIEW_LIMIT && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-amber-900 hover:bg-amber-100"
                      onClick={() => setFilter('scheduled')}
                    >
                      Zobacz wszystkie zadania do zaplanowania
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completed Tasks Time Filter */}
          {filter === 'completed' && (
            <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3">
                <span className="text-xs md:text-sm font-medium text-gray-600">Pokaż zadania ukończone:</span>
                <select 
                  value={completedTimeFilter} 
                  onChange={(e) => setCompletedTimeFilter(e.target.value as CompletedTimeFilter)}
                  className="flex-1 sm:max-w-xs px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent text-xs md:text-sm font-medium hover:border-gray-400 transition-colors"
                >
                  <option value="today">Dzisiaj</option>
                  <option value="yesterday">Wczoraj</option>
                  <option value="last7days">W ostatnich 7 dniach</option>
                  <option value="last30days">W ostatnich 30 dniach</option>
                  <option value="thisMonth">W tym miesiącu</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Bulk Actions Bar */}
      {view === 'list' && sortedTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <input
                type="checkbox"
                checked={selectedTaskIds.size === sortedTasks.length && sortedTasks.length > 0}
                onChange={toggleAllTasksSelection}
                className="w-4 h-4 text-brand-purple border-gray-300 rounded focus:ring-brand-purple cursor-pointer flex-shrink-0"
                title="Zaznacz"
              />
              <span className="text-xs md:text-sm font-medium text-gray-700">
                {selectedTaskIds.size > 0 ? `Zaznaczono ${selectedTaskIds.size}` : 'Zaznacz'}
              </span>
            </div>
            
            {selectedTaskIds.size > 0 && (
              <>
                <div className="h-6 w-px bg-gray-300 hidden sm:block" />
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkComplete}
                      disabled={bulkActionLoading}
                      className="gap-1.5 flex-1 sm:flex-initial text-xs md:text-sm"
                    >
                      <CheckSquare size={14} weight="bold" />
                      <span>Ukończ</span>
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      disabled={bulkActionLoading}
                      className="gap-1.5 text-red-600 hover:bg-red-50 flex-1 sm:flex-initial text-xs md:text-sm"
                    >
                      <Trash size={14} weight="bold" />
                      <span>Usuń</span>
                    </Button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">Przenieś na:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkMove(e.target.value)
                          e.target.value = ''
                        }
                      }}
                      disabled={bulkActionLoading}
                      className="text-xs md:text-sm px-2 md:px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                    >
                      <option value="">Przenieś na...</option>
                      <option value={format(new Date(), 'yyyy-MM-dd')}>Dziś</option>
                      <option value={format(addDays(new Date(), 1), 'yyyy-MM-dd')}>Jutro</option>
                      <option value={format(addDays(new Date(), 3), 'yyyy-MM-dd')}>Za 3 dni</option>
                      <option value={format(addDays(new Date(), 7), 'yyyy-MM-dd')}>Za tydzień</option>
                    </select>
                    
                    <span className="text-xs md:text-sm text-gray-600 text-center hidden sm:inline">lub</span>
                    
                    <input
                      type="date"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkMove(e.target.value)
                          e.target.value = ''
                        }
                      }}
                      disabled={bulkActionLoading}
                      className="text-xs md:text-sm px-2 md:px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                      placeholder="Wybierz datę"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="mt-6">
        {loading && tasks.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Ładowanie zadań...</span>
            </div>
          </Card>
        ) : view === 'list' ? (
          sortedTasks.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarBlank size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Brak zadań</h3>
              <p className="text-gray-500 mb-4">
                {filter === 'today' && 'Nie masz zadań na dziś'}
                {filter === 'tomorrow' && 'Nie masz zadań na jutro'}
                {filter === 'week' && 'Nie masz zadań w tym tygodniu'}
                {filter === 'month' && 'Nie masz zadań w tym miesiącu'}
                {filter === 'scheduled' && 'Nie masz zadań do zaplanowania'}
                {filter === 'completed' && 'Nie masz ukończonych zadań'}
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus size={18} />
                Dodaj pierwsze zadanie
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {isScheduledFilter && groupBy === 'none' ? (
                <>
                  {scheduledOverdueTasks.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-700">Przeterminowane</h3>
                        <Badge variant="secondary" className="text-xs">
                          {scheduledOverdueTasks.length}
                        </Badge>
                      </div>
                      {renderTaskCards(scheduledOverdueTasks)}
                    </div>
                  )}

                  {scheduledUndatedTasks.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-700">Bez daty</h3>
                        <Badge variant="secondary" className="text-xs">
                          {scheduledUndatedTasks.length}
                        </Badge>
                      </div>
                      {renderTaskCards(scheduledUndatedTasks)}
                    </div>
                  )}
                </>
              ) : (
                Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                  <div key={groupName}>
                    {groupBy !== 'none' && (
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-700">{groupName}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {groupTasks.length}
                        </Badge>
                      </div>
                    )}
                    <div className="space-y-3">
                      {groupTasks.map(task => (
                        <TaskCard 
                          key={task.id}
                          task={task}
                          onComplete={handleComplete}
                          onDelete={handleDelete}
                          onDetails={(t) => {
                            setSelectedTask(t)
                            setShowDetailsModal(true)
                          }}
                          selectable={selectedTaskIds.size > 0}
                          selected={selectedTaskIds.has(task.id)}
                          onToggleSelection={toggleTaskSelection}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        ) : view === 'board' ? (
          <SevenDaysBoardView 
            tasks={activeTasks}
            onMove={handleMove}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onDetails={(t) => {
              setSelectedTask(t)
              setShowDetailsModal(true)
            }}
            onAddForDate={(date) => {
              setShowCreateModal(true)
              // TODO: Pre-fill date in CreateTaskModal
            }}
          />
        ) : null}
      </div>
      
      {/* Modals */}
      <CreateTaskModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateTask={handleAddTask}
      />
      
      <TaskDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        task={selectedTask}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onComplete={handleComplete}
        onDuplicate={handleDuplicate}
      />
      
      <PomodoroTimer
        open={showPomodoro}
        onOpenChange={setShowPomodoro}
        taskId={selectedTask?.id}
        taskTitle={selectedTask?.content}
      />
      
      {/* Task Timer (floating widget) */}
      <TaskTimer />
    </div>
  )
}
