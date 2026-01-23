'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { Plus, List, Kanban, CalendarBlank, Calendar, CheckSquare, Trash, Funnel, SlidersHorizontal, SortAscending, FolderOpen, Lightning, DotsThree } from '@phosphor-icons/react'
import { startOfDay, addDays, parseISO, isSameDay, isBefore, isWithinInterval, format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { UniversalTaskModal, TaskData } from '@/components/common/UniversalTaskModal'
import { TaskCard } from './TaskCard'
import { SevenDaysBoardView } from './SevenDaysBoardView'
import { MonthView } from './MonthView'
import { TaskTimer } from './TaskTimer'
import { PomodoroTimer } from './PomodoroTimer'
import { supabase } from '@/lib/supabaseClient'
import Dialog, { DialogContent } from '@/components/ui/Dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'

interface Task {
  id: string
  content: string
  description?:  string
  project_id?:  string
  priority:  1 | 2 | 3 | 4
  due?:  { date: string } | string
  completed?: boolean
  created_at?: string
  subtasks?: any[]
  duration?: number
  labels?: string[]
}

interface Project {
  id: string
  name: string
  color?:  string
}

type ViewType = 'list' | 'board'
type BoardGrouping = 'day' | 'status' | 'priority' | 'project'
type FiltersState = {
  projectIds?: string[]
  status?: string[]
  priority?: (1 | 2 | 3 | 4)[]
  dateRange?: { from?: string; to?: string }
}
type FilterType = 'today' | 'tomorrow' | 'week' | 'month' | 'overdue' | 'unscheduled' | 'all' | 'completed'
type CompletedRange = 'recent' | 'all'
type SortType = 'date' | 'priority' | 'name'
type GroupByType = 'none' | 'day' | 'project' | 'priority'

// Todoist sync interval (2 minutes)
const TODOIST_SYNC_INTERVAL_MS = 2 * 60 * 1000

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

export function TasksAssistant() {
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewType>('list')
  const [boardGrouping, setBoardGrouping] = useState<BoardGrouping>('day')
  const [filters, setFilters] = useState<FiltersState>({})
  const [filter, setFilter] = useState<FilterType>('today')  // ✅ Default to "Dziś"
  const [completedRange, setCompletedRange] = useState<CompletedRange>('recent')
  const [completedSearch, setCompletedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('date')
  const [groupBy, setGroupBy] = useState<GroupByType>('none')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [mobileControl, setMobileControl] = useState<'sort' | 'group' | 'project' | null>(null)
  const [showUniversalModal, setShowUniversalModal] = useState(false)
  const [universalModalTask, setUniversalModalTask] = useState<Task | null>(null)
  const [showPomodoro, setShowPomodoro] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [activeTimerInfo, setActiveTimerInfo] = useState<{ taskId: string; taskTitle: string; isActive: boolean; elapsedSeconds?: number; startTime?: number } | null>(null)
  
  // Mobile bottom sheet states
  const [mobileBottomSheet, setMobileBottomSheet] = useState<'filter' | 'group' | 'sort' | 'project' | 'quick' | null>(null)
  
  // Feature flag for unified task API (Phase 2B)
  const USE_UNIFIED_API = process.env.NEXT_PUBLIC_USE_UNIFIED_TASKS === 'true'
  
  // Ref for cleanup in auto-sync effect
  const syncCleanupRef = useRef(true)
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null

  const smartViews = useMemo(() => ([
    {
      label: '🔥 Dziś + priorytet',
      desc: 'Najważniejsze na dziś',
      apply: () => {
        setView('list')
        setFilter('today')
        setSortBy('priority')
        setGroupBy('priority')
      }
    },
    {
      label: '📅 Tydzień wg dnia',
      desc: 'Plan na kolejne dni',
      apply: () => {
        setView('list')
        setFilter('week')
        setSortBy('date')
        setGroupBy('day')
      }
    },
    {
      label: '🚀 Do zaplanowania',
      desc: 'Zadania bez daty',
      apply: () => {
        setView('list')
        setFilter('unscheduled')
        setSortBy('name')
        setGroupBy('project')
      }
    },
    {
      label: '✅ Ukończone',
      desc: 'Szybki przegląd',
      apply: () => {
        setView('list')
        setFilter('completed')
        setSortBy('date')
        setGroupBy('none')
      }
    }
  ]), [])
  
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      console.log('🔍 Fetching tasks with token:', token ? 'EXISTS' : 'MISSING', 'USE_UNIFIED_API:', USE_UNIFIED_API)
      
      // If unified API is enabled, try that first
      if (USE_UNIFIED_API) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const res = await fetch(`/api/tasks?source=all&includeCompleted=${filter === 'completed'}`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
            
            if (res.ok) {
              const data = await res.json()
              console.log('📦 Unified API data:', data)
              const fetchedTasks = data.tasks || []
              
              // Map tasks to expected format
              const mapped = fetchedTasks.map((t: any) => ({
                id: t.id,
                content: t.title,
                description: t.description,
                priority: t.priority,
                due: t.due_date,
                _dueYmd: t.due_date,
                completed: t.completed,
                created_at: t.created_at,
                project_id: t.project_id,
                labels: t.tags || [],
                duration: t.estimate_min
              }))
              
              console.log('✅ Unified API - Mapped tasks:', mapped)
              setTasks(mapped)
              setLoading(false)
              return
            }
          }
          
          console.warn('⚠️ Unified API failed or no session, falling back to Todoist API')
        } catch (unifiedError) {
          console.error('❌ Unified API error, falling back to Todoist API:', unifiedError)
        }
      }
      
      // Original Todoist API (backward compatibility)
      // Use POST to pass filter parameter
      const res = await fetch('/api/todoist/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, filter, completedRange, search: completedSearch || undefined })
      })
      
      console.log('📡 Response status:', res.status)
      
      if (!res.ok) throw new Error('Failed to fetch tasks')
      
      const data = await res.json()
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
  }, [token, filter, completedRange, completedSearch, USE_UNIFIED_API])
  
  const fetchProjects = useCallback(async () => {
    try {
      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.warn('⚠️ [TasksAssistant] No session available for fetching projects')
        return
      }
      
      // Use Authorization header with Supabase token
      const res = await fetch('/api/todoist/projects', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || data || [])
        console.log('✅ [TasksAssistant] Fetched projects:', data.projects?.length || 0)
      } else {
        const errorText = await res.text()
        console.error('❌ [TasksAssistant] Failed to fetch projects:', res.status, errorText)
        showToast('Nie udało się pobrać projektów z Todoist', 'error')
      }
    } catch (err) {
      console.error('❌ [TasksAssistant] Error fetching projects:', err)
      showToast('Błąd przy pobieraniu projektów', 'error')
    }
  }, [showToast])
  
  // Fetch tasks initially
  useEffect(() => {
    // In unified API mode without token, always fetch local tasks
    // In legacy mode, require token
    if (!token && !USE_UNIFIED_API) return
    
    // Initial fetch on mount
    fetchTasks()
    
    // Note: Periodic fetching is handled by the auto-sync effect below for Todoist users
    // For non-Todoist users, we poll every 45 seconds
    if (!token) {
      const interval = setInterval(() => {
        fetchTasks()
      }, 45000)
      
      return () => clearInterval(interval)
    }
  }, [token, fetchTasks, USE_UNIFIED_API])
  
  // Fetch projects
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])
  
  // Auto-sync with Todoist on mount and periodically
  useEffect(() => {
    if (!token) return
    
    const triggerSync = async () => {
      if (!syncCleanupRef.current) return  // Skip if component unmounted
      
      try {
        console.log('🔄 [TasksAssistant] Auto-syncing with Todoist...')
        
        const { data } = await supabase.auth.getSession()
        if (!data?.session || !syncCleanupRef.current) return
        
        const response = await fetch('/api/todoist/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!syncCleanupRef.current) return  // Check again before proceeding
        
        if (response.ok) {
          console.log('✅ [TasksAssistant] Todoist sync completed')
          // Refresh tasks after sync
          if (syncCleanupRef.current) {
            await fetchTasks()
          }
        } else {
          console.warn('⚠️ [TasksAssistant] Todoist sync failed:', response.status)
        }
      } catch (error) {
        if (syncCleanupRef.current) {
          console.error('❌ [TasksAssistant] Sync error:', error)
        }
      }
    }
    
    // Sync on mount
    triggerSync()
    
    // Sync every 2 minutes
    const syncInterval = setInterval(triggerSync, TODOIST_SYNC_INTERVAL_MS)
    
    return () => {
      syncCleanupRef.current = false
      clearInterval(syncInterval)
    }
  }, [token, fetchTasks])
  
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
  const filterTasks = (tasks: Task[], filterType: FilterType) => {
    console.log('🔍 FILTER DEBUG:', {
      totalTasks: tasks.length,
      filterType,
      tasks: tasks.map(t => ({
        id: t.id,
        content: t.content,
        due: t.due,
        completed: t.completed
      }))
    })
    
    // If filter is 'completed', tasks are already filtered by API
    // Just return them as-is
    if (filterType === 'completed') {
      return tasks
    }
    
    const now = startOfDay(new Date())
    
    const filtered = tasks.filter(task => {
      // Skip completed tasks for non-completed filters
      if (task.completed) {
        console.log('⏭️ Skipping completed task:', task.content)
        return false
      }
      
      const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
      
      if (filterType === 'all') return true
      
      // Handle unscheduled filter - show only tasks without due date
      if (filterType === 'unscheduled') {
        return !dueStr
      }
      
      if (!dueStr) {
        console.log('⏭️ Skipping task without due date:', task.content)
        return false
      }
      
      try {
        const dueDate = startOfDay(parseISO(dueStr))
        
        console.log('📅 Checking task:', {
          content: task.content,
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
              start: now,
              end: addDays(now, 6)
            })
            console.log('  → isInWeek:', isInWeek)
            return isInWeek
          case 'month':
            const isInMonth = isWithinInterval(dueDate, {
              start: now,
              end: addDays(now, 29)
            })
            console.log('  → isInMonth:', isInMonth)
            return isInMonth
          case 'overdue':
            const isOverdue = isBefore(dueDate, now)
            console.log('  → isOverdue:', isOverdue)
            return isOverdue
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
  }
  
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
  let filteredTasks = filterTasks(tasks, filter)
  filteredTasks = filterByProject(filteredTasks)
  const sortedTasks = sortTasks(filteredTasks)
  
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
          user_id: token || 'anonymous',
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
      
      // If unified API is enabled, try that first
      if (USE_UNIFIED_API) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const source = token ? 'todoist' : 'local'
            const sync_to_external = !!token
            
            const res = await fetch('/api/tasks', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                title: taskData.content,
                description: taskData.description,
                priority: taskData.priority || 3,
                due_date: taskData.due_date,
                estimate_min: taskData.duration || 30,
                source: source,
                sync_to_external: sync_to_external,
                project_id: taskData.project_id,
                labels: taskData.labels || []
              })
            })
            
            if (res.ok) {
              const data = await res.json()
              const newTask = data.task
              
              console.log('✅ Task created via unified API:', newTask)
              
              // Map to expected format
              const mappedTask = {
                id: newTask.id,
                content: newTask.title,
                description: newTask.description,
                priority: newTask.priority,
                due: newTask.due_date,
                _dueYmd: newTask.due_date,
                completed: newTask.completed,
                created_at: newTask.created_at,
                project_id: taskData.project_id,
                labels: taskData.labels || [],
                duration: newTask.estimate_min
              }
              
              setTasks(prev => [mappedTask, ...prev])
              
              if (data.sync_queued) {
                showToast('Zadanie zostało utworzone. Synchronizacja w tle...', 'success')
              } else {
                showToast('Zadanie zostało utworzone', 'success')
              }
              
              // Track analytics
              trackTaskAnalytics({
                task_id: newTask.id,
                task_title: newTask.title,
                task_project: taskData.project_id || null,
                task_labels: taskData.labels || [],
                priority: taskData.priority || 4,
                estimated_duration: taskData.duration || null,
                due_date: taskData.due_date || null,
                action_type: 'created'
              })
              
              // Refresh tasks to get updated list
              setTimeout(() => fetchTasks(), 500)
              return
            }
            
            console.warn('⚠️ Unified API failed, falling back to Todoist API')
          }
        } catch (unifiedError) {
          console.error('❌ Unified API error, falling back to Todoist API:', unifiedError)
        }
      }
      
      // Original Todoist API (backward compatibility)
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
      setTimeout(() => fetchTasks(), 500)
      
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

  const sortLabel = sortBy === 'date' ? 'Data' : sortBy === 'priority' ? 'Priorytet' : 'Nazwa'
  const activeProjectLabel = selectedProject === 'all' 
    ? 'Wszystkie projekty' 
    : projects.find(p => p.id === selectedProject)?.name || 'Projekt'
  const filterLabelMap: Record<FilterType, string> = {
    today: 'Zadania na dziś',
    tomorrow: 'Zadania na jutro',
    week: 'Zadania na ten tydzień',
    month: 'Zadania na ten miesiąc',
    overdue: 'Przeterminowane zadania',
    unscheduled: 'Zadania do zaplanowania',
    all: 'Wszystkie zadania',
    completed: 'Ukończone zadania'
  }
  const activeFilterLabel = filterLabelMap[filter] || 'Wszystkie zadania'
  
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
  
  // Unified handler for UniversalTaskModal (handles both create and update)
  const handleUniversalSave = async (taskData: TaskData) => {
    if (taskData.id) {
      // UPDATE existing task
      await handleUpdate(taskData.id, {
        content: taskData.content,
        description: taskData.description,
        priority: taskData.priority,
        due: taskData.due,
        project_id: taskData.project_id,
        labels: taskData.labels,
        duration: taskData.estimated_minutes
      })
    } else {
      // CREATE new task
      await handleAddTask({
        content: taskData.content,
        description: taskData.description,
        priority: taskData.priority,
        due_date: taskData.due,
        project_id: taskData.project_id,
        labels: taskData.labels,
        duration: taskData.estimated_minutes,
        token
      })
    }
    // Close modal after save
    setShowUniversalModal(false)
    setUniversalModalTask(null)
  }
  
  // Convert Task to TaskData for UniversalTaskModal
  const taskToTaskData = (task: Task | null): TaskData | null => {
    if (!task) return null
    return {
      id: task.id,
      content: task.content,
      description: task.description,
      estimated_minutes: task.duration || 0,
      // Note: cognitive_load defaults to 0 as this field is not currently tracked in Task model
      // Future enhancement: Add cognitive load tracking to Todoist tasks
      cognitive_load: 0,
      project_id: task.project_id,
      priority: task.priority,
      due: typeof task.due === 'string' ? task.due : task.due?.date,
      labels: task.labels
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
  
  const handleBulkComplete = async () => {
    if (selectedTaskIds.size === 0) return
    
    const confirmed = confirm(`Czy na pewno chcesz ukończyć ${selectedTaskIds.size} zadań?`)
    if (!confirmed) return
    
    setBulkActionLoading(true)
    const totalCount = selectedTaskIds.size
    let successCount = 0
    let failCount = 0
    
    try {
      // Execute all complete operations (individual toasts will show for any errors)
      for (const taskId of selectedTaskIds) {
        try {
          await handleComplete(taskId)
          successCount++
        } catch (err) {
          console.error(`Error completing task ${taskId}:`, err)
          failCount++
          // Continue with other tasks even if one fails
        }
      }
      
      // Show appropriate toast based on results
      if (failCount === 0) {
        showToast(`Ukończono wszystkie ${successCount} zadań`, 'success')
      } else if (successCount > 0) {
        showToast(`Ukończono ${successCount} z ${totalCount} zadań (${failCount} błędów)`, 'warning')
      } else {
        showToast(`Nie udało się ukończyć zadań`, 'error')
      }
    } finally {
      setBulkActionLoading(false)
      setSelectedTaskIds(new Set())
    }
  }
  
  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return
    
    const confirmed = confirm(`Czy na pewno chcesz usunąć ${selectedTaskIds.size} zadań?`)
    if (!confirmed) return
    
    setBulkActionLoading(true)
    const totalCount = selectedTaskIds.size
    let successCount = 0
    let failCount = 0
    
    try {
      // Execute all delete operations (individual toasts will show for any errors)
      for (const taskId of selectedTaskIds) {
        try {
          await handleDelete(taskId)
          successCount++
        } catch (err) {
          console.error(`Error deleting task ${taskId}:`, err)
          failCount++
          // Continue with other tasks even if one fails
        }
      }
      
      // Show appropriate toast based on results
      if (failCount === 0) {
        showToast(`Usunięto wszystkie ${successCount} zadań`, 'success')
      } else if (successCount > 0) {
        showToast(`Usunięto ${successCount} z ${totalCount} zadań (${failCount} błędów)`, 'warning')
      } else {
        showToast(`Nie udało się usunąć zadań`, 'error')
      }
    } finally {
      setBulkActionLoading(false)
      setSelectedTaskIds(new Set())
    }
  }
  
  const handleBulkMove = async (newDate: string) => {
    if (selectedTaskIds.size === 0) return
    
    setBulkActionLoading(true)
    const totalCount = selectedTaskIds.size
    let successCount = 0
    let failCount = 0
    
    try {
      // Execute all move operations (individual toasts will show for any errors)
      for (const taskId of selectedTaskIds) {
        try {
          await handleMove(taskId, newDate)
          successCount++
        } catch (err) {
          console.error(`Error moving task ${taskId}:`, err)
          failCount++
          // Continue with other tasks even if one fails
        }
      }
      
      // Show appropriate toast based on results
      if (failCount === 0) {
        showToast(`Przeniesiono wszystkie ${successCount} zadań`, 'success')
      } else if (successCount > 0) {
        showToast(`Przeniesiono ${successCount} z ${totalCount} zadań (${failCount} błędów)`, 'warning')
      } else {
        showToast(`Nie udało się przenieść zadań`, 'error')
      }
    } finally {
      setBulkActionLoading(false)
      setSelectedTaskIds(new Set())
    }
  }
  
  // OAuth Connection Screen
  if (!token && !USE_UNIFIED_API) {
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
    <div className="space-y-6 mobile-bottom-bar-spacing md:pb-6">{/* Extra bottom padding on mobile for fixed bottom bar */}
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
                    setUniversalModalTask(task)
                    setShowUniversalModal(true)
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
      <div className="flex flex-col gap-6">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
              Zarządzanie Zadaniami
            </h1>
            <p className="text-sm md:text-lg text-gray-600 mt-1 md:mt-2">Organizuj swoje zadania efektywnie</p>
          </div>
          
          {/* HIDE button on mobile - FAB is available */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              onClick={() => {
                setUniversalModalTask(null)
                setShowUniversalModal(true)
              }} 
              className="gap-2 bg-gradient-to-r from-brand-purple to-brand-pink hover:shadow-lg transition-all hover:scale-105"
              size="lg"
            >
              <Plus size={20} weight="bold" />
              <span className="hidden sm:inline">Dodaj zadanie</span>
            </Button>
          </div>
        </div>
        
        {/* Control Bar - Compact Desktop Layout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: View switcher */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                <button 
                  onClick={() => setView('list')}
                  className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 font-medium text-sm ${
                    view === 'list' 
                      ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`}
                  title="Widok listy"
                >
                  <List size={16} weight="bold" />
                  <span className="hidden md:inline">Lista</span>
                </button>
                <button 
                  onClick={() => setView('board')}
                  className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 font-medium text-sm ${
                    view === 'board' 
                      ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`}
                  title="Widok tablicy"
                >
                  <Kanban size={16} weight="bold" />
                  <span className="hidden md:inline">Tablica</span>
                </button>
              </div>
            </div>
            
            {/* Middle: Compact filters - Desktop only (≥768px) */}
            <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-purple transition-colors min-w-[120px] max-w-[180px]"
              >
                <option value="date">📅 Data</option>
                <option value="priority">🚩 Priorytet</option>
                <option value="name">🔤 Nazwa</option>
              </select>
              
              {view === 'list' && (
                <select 
                  value={groupBy} 
                  onChange={(e) => setGroupBy(e.target.value as GroupByType)}
                  className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-purple transition-colors min-w-[120px] max-w-[180px]"
                >
                  <option value="none">📋 Brak</option>
                  <option value="day">📅 Dzień</option>
                  <option value="project">📁 Projekt</option>
                  <option value="priority">🚩 Priorytet</option>
                </select>
              )}
              
              <select 
                value={selectedProject} 
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-purple transition-colors min-w-[120px] max-w-[180px]"
              >
                <option value="all">📁 Projekty</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            {/* Right: Task count badge */}
            <div className="hidden md:block">
              <Badge variant="secondary" className="text-xs px-2 py-1 font-semibold whitespace-nowrap">
                {activeFilterLabel} · {sortedTasks.length} {sortedTasks.length === 1 ? 'zadanie' : 'zadań'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters - Desktop only */}
      {view === 'list' && (
        <div className="mb-4 hidden md:block">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 pb-2">
              <TabsList className="inline-flex w-auto min-w-full lg:w-full justify-start gap-1 h-9">
                <TabsTrigger value="today" className="flex-shrink-0 text-xs px-3">Dziś</TabsTrigger>
                <TabsTrigger value="tomorrow" className="flex-shrink-0 text-xs px-3">Jutro</TabsTrigger>
                <TabsTrigger value="week" className="flex-shrink-0 text-xs px-3">Tydzień</TabsTrigger>
                <TabsTrigger value="month" className="flex-shrink-0 text-xs px-3">Miesiąc</TabsTrigger>
                <TabsTrigger value="overdue" className="flex-shrink-0 text-xs px-3">Przeterminowane</TabsTrigger>
                
                {/* Dropdown for more filters and smart views */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex-shrink-0 px-2 text-xs inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors hover:bg-gray-100 h-9 border border-transparent data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                      aria-label="Więcej opcji filtrowania"
                    >
                      <DotsThree size={16} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filtry specjalne</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setFilter('unscheduled')}>
                      Do zaplanowania
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter('completed')}>
                      Ukończone
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter('all')}>
                      Wszystkie
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuLabel>⚡ Szybkie widoki</DropdownMenuLabel>
                    {smartViews.map((smartView, idx) => (
                      <DropdownMenuItem key={idx} onClick={() => smartView.apply()}>
                        {smartView.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TabsList>
            </div>
          </Tabs>
          
          {filter === 'completed' && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <select
                value={completedRange}
                onChange={(e) => setCompletedRange(e.target.value as CompletedRange)}
                className="w-full sm:w-[220px] px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-purple text-sm font-medium hover:border-gray-300 transition-colors"
              >
                <option value="recent">Ukończone (ostatnie 7 dni)</option>
                <option value="all">Ukończone (wszystkie)</option>
              </select>
              
              <input
                type="text"
                value={completedSearch}
                onChange={(e) => setCompletedSearch(e.target.value)}
                placeholder="Szukaj ukończonych zadań..."
                className="w-full sm:flex-1 px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-purple text-sm"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Bulk Actions Bar - Only show when tasks are selected */}
      {view === 'list' && selectedTaskIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-blue-900 font-medium">
              {selectedTaskIds.size} zaznaczonych
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkComplete}
                disabled={bulkActionLoading}
                className="gap-2 h-8 text-xs"
              >
                <CheckSquare size={14} weight="bold" />
                Ukończ
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="gap-2 text-red-600 hover:bg-red-50 h-8 text-xs"
              >
                <Trash size={14} weight="bold" />
                Usuń
              </Button>
              
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkMove(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  disabled={bulkActionLoading}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-purple h-8"
                >
                  <option value="">Przenieś...</option>
                  <option value={format(new Date(), 'yyyy-MM-dd')}>Dziś</option>
                  <option value={format(addDays(new Date(), 1), 'yyyy-MM-dd')}>Jutro</option>
                  <option value={format(addDays(new Date(), 3), 'yyyy-MM-dd')}>Za 3 dni</option>
                  <option value={format(addDays(new Date(), 7), 'yyyy-MM-dd')}>Za tydzień</option>
                </select>
                
                <input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkMove(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  disabled={bulkActionLoading}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-purple h-8"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Checkbox for selecting all - Only show when there are tasks and nothing selected yet */}
      {view === 'list' && sortedTasks.length > 0 && selectedTaskIds.size === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 mb-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedTaskIds.size === sortedTasks.length && sortedTasks.length > 0}
              onChange={toggleAllTasksSelection}
              className="w-4 h-4 text-brand-purple border-gray-300 rounded focus:ring-brand-purple cursor-pointer"
              title="Zaznacz wszystkie"
            />
            <span className="text-sm font-medium text-gray-700">
              {activeFilterLabel} — zaznacz wszystkie
            </span>
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
                {filter === 'overdue' && 'Nie masz przeterminowanych zadań'}
                {filter === 'completed' && 'Nie masz ukończonych zadań'}
              </p>
              <Button onClick={() => {
                setUniversalModalTask(null)
                setShowUniversalModal(true)
              }} className="gap-2">
                <Plus size={18} />
                Dodaj pierwsze zadanie
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
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
                          setUniversalModalTask(t)
                          setShowUniversalModal(true)
                        }}
                        onMove={handleMove}
                        selectable={selectedTaskIds.size > 0}
                        selected={selectedTaskIds.has(task.id)}
                        onToggleSelection={toggleTaskSelection}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : view === 'board' ? (
      <SevenDaysBoardView 
        tasks={activeTasks}
        grouping={boardGrouping}
        onMove={handleMove}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onDetails={(t) => {
          setUniversalModalTask(t)
          setShowUniversalModal(true)
        }}
        onAddForKey={(key) => {
          setUniversalModalTask({
            id: '',
            content: '',
            description: '',
            project_id: key === 'all' ? undefined : key,
            priority: 4,
            due: boardGrouping === 'day' ? key : undefined
          } as Task)
          setShowUniversalModal(true)
        }}
      />
        ) : null}
      </div>
      
      {/* Modals */}
      {/* Note: UniversalTaskModal replaces CreateTaskModal and TaskDetailsModal
          Trade-off: Duplicate functionality removed in favor of simpler unified interface
          Users can still create new tasks easily via the "Dodaj zadanie" button */}
      <UniversalTaskModal 
        open={showUniversalModal}
        onOpenChange={setShowUniversalModal}
        task={taskToTaskData(universalModalTask)}
        onSave={handleUniversalSave}
        onDelete={handleDelete}
        onComplete={handleComplete}
      />
      
      <PomodoroTimer
        open={showPomodoro}
        onOpenChange={setShowPomodoro}
        taskId={universalModalTask?.id}
        taskTitle={universalModalTask?.content}
      />
      
      {/* Task Timer (floating widget) */}
      <TaskTimer />
      
      {/* Mobile Bottom Bar (only on mobile < 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 py-3">
          <button
            onClick={() => setMobileBottomSheet('filter')}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all min-w-[44px] min-h-[44px]"
            aria-label="Filtry"
          >
            <Funnel size={20} weight="bold" className="text-brand-purple" />
            <span className="text-xs font-medium text-gray-700">Filtr</span>
          </button>
          
          {view === 'list' && (
            <button
              onClick={() => setMobileBottomSheet('group')}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all min-w-[44px] min-h-[44px]"
              aria-label="Grupowanie"
            >
              <SlidersHorizontal size={20} weight="bold" className="text-brand-purple" />
              <span className="text-xs font-medium text-gray-700">Grupuj</span>
            </button>
          )}
          
          <button
            onClick={() => setMobileBottomSheet('sort')}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all min-w-[44px] min-h-[44px]"
            aria-label="Sortowanie"
          >
            <SortAscending size={20} weight="bold" className="text-brand-purple" />
            <span className="text-xs font-medium text-gray-700">Sort</span>
          </button>
          
          <button
            onClick={() => setMobileBottomSheet('project')}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all min-w-[44px] min-h-[44px]"
            aria-label="Projekty"
          >
            <FolderOpen size={20} weight="bold" className="text-brand-purple" />
            <span className="text-xs font-medium text-gray-700">Projekt</span>
          </button>
          
          <button
            onClick={() => setMobileBottomSheet('quick')}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all min-w-[44px] min-h-[44px]"
            aria-label="Szybkie widoki"
          >
            <Lightning size={20} weight="bold" className="text-brand-purple" />
            <span className="text-xs font-medium text-gray-700">Szybkie</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Bottom Sheets */}
      <BottomSheet
        isOpen={mobileBottomSheet === 'filter'}
        onClose={() => setMobileBottomSheet(null)}
        title="Filtry"
      >
        <div className="space-y-2">
          {[
            { value: 'today', label: 'Dziś', icon: '📅' },
            { value: 'tomorrow', label: 'Jutro', icon: '📆' },
            { value: 'week', label: 'Tydzień', icon: '📅' },
            { value: 'month', label: 'Miesiąc', icon: '📅' },
            { value: 'overdue', label: 'Przeterminowane', icon: '⚠️' },
            { value: 'unscheduled', label: 'Do zaplanowania', icon: '📋' },
            { value: 'completed', label: 'Ukończone', icon: '✅' }
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => {
                setFilter(value as FilterType)
                setMobileBottomSheet(null)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[44px] ${
                filter === value
                  ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
      
      <BottomSheet
        isOpen={mobileBottomSheet === 'group'}
        onClose={() => setMobileBottomSheet(null)}
        title="Grupowanie"
      >
        <div className="space-y-2">
          {[
            { value: 'none', label: 'Brak', icon: '📋' },
            { value: 'day', label: 'Dzień', icon: '📅' },
            { value: 'project', label: 'Projekt', icon: '📁' },
            { value: 'priority', label: 'Priorytet', icon: '🚩' }
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => {
                setGroupBy(value as GroupByType)
                setMobileBottomSheet(null)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[44px] ${
                groupBy === value
                  ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
      
      <BottomSheet
        isOpen={mobileBottomSheet === 'sort'}
        onClose={() => setMobileBottomSheet(null)}
        title="Sortowanie"
      >
        <div className="space-y-2">
          {[
            { value: 'date', label: 'Data', icon: '📅' },
            { value: 'priority', label: 'Priorytet', icon: '🚩' },
            { value: 'name', label: 'Nazwa', icon: '🔤' }
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => {
                setSortBy(value as SortType)
                setMobileBottomSheet(null)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[44px] ${
                sortBy === value
                  ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
      
      <BottomSheet
        isOpen={mobileBottomSheet === 'project'}
        onClose={() => setMobileBottomSheet(null)}
        title="Projekty"
      >
        <div className="space-y-2">
          <button
            onClick={() => {
              setSelectedProject('all')
              setMobileBottomSheet(null)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[44px] ${
              selectedProject === 'all'
                ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl">📁</span>
            <span className="font-medium">Wszystkie projekty</span>
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                setSelectedProject(project.id)
                setMobileBottomSheet(null)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[44px] ${
                selectedProject === project.id
                  ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: project.color || '#8B5CF6' }}
              />
              <span className="font-medium">{project.name}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
      
      <BottomSheet
        isOpen={mobileBottomSheet === 'quick'}
        onClose={() => setMobileBottomSheet(null)}
        title="Szybkie widoki"
      >
        <div className="space-y-2">
          {smartViews.map((smartView, idx) => (
            <button
              key={idx}
              onClick={() => {
                smartView.apply()
                setMobileBottomSheet(null)
              }}
              className="w-full flex flex-col items-start gap-1 px-4 py-3 rounded-xl transition-all min-h-[44px] bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            >
              <span className="font-medium">{smartView.label}</span>
              <span className="text-xs text-gray-500">{smartView.desc}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
