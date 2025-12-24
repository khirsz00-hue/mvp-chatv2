'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { Toaster, toast } from 'sonner'
import { syncTodoist, startBackgroundSync } from '@/lib/todoistSync'
import {
  ENERGY_FOCUS_PRESETS,
  DayPlan,
  TestDayTask,
  Proposal,
  ContextType,
  Recommendation
} from '@/lib/types/dayAssistantV2'
import {
  checkLightTaskLimit,
  generateUnmarkMustWarning,
  calculateScoreBreakdown
} from '@/lib/services/dayAssistantV2RecommendationEngine'
import { CONTEXT_LABELS, CONTEXT_COLORS, TaskContext } from '@/lib/services/contextInferenceService'
import { Play, XCircle, MagicWand, Gear, Info, Coffee, CaretDown, CaretUp } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useScoredTasks } from '@/hooks/useScoredTasks'
import { useTaskQueue } from '@/hooks/useTaskQueue'
import { useTaskTimer, TimerState } from '@/hooks/useTaskTimer'
import { useCompleteTask, useDeleteTask, useTogglePinTask, usePostponeTask, useToggleSubtask, useAcceptRecommendation } from '@/hooks/useTasksQuery'
import { useRecommendations } from '@/hooks/useRecommendations'
import { getSmartEstimate, getFormattedEstimate } from '@/lib/utils/estimateHelpers'
import { TaskBadges } from './TaskBadges'
import { TaskContextMenu } from './TaskContextMenu'
import { TaskDetailsModal } from './TaskDetailsModal'
import { RecommendationPanel } from './RecommendationPanel'
import { WorkModeSelector, WorkMode } from './WorkModeSelector'
import { HelpMeModal } from './HelpMeModal'
import { WorkHoursConfigModal } from './WorkHoursConfigModal'
import { AddTimeBlockModal } from './AddTimeBlockModal'
import { TaskTimer } from './TaskTimer'
import { OverdueTasksSection } from './OverdueTasksSection'
import { MorningReviewModal } from './MorningReviewModal'
import { ClarifyModal } from './ClarifyModal'
import { QueueReorderingOverlay } from './LoadingStates'
import { CurrentActivityBox } from './CurrentActivityBox'
import { BreakTimer } from './BreakTimer'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { StreakDisplay } from '@/components/gamification/StreakDisplay'
import { ProgressRing } from '@/components/gamification/ProgressRing'
import { QuickAddModal } from './QuickAddModal'
import { updateStreakOnCompletion, updateDailyStats, triggerConfetti, triggerMilestoneToast, recalculateDailyTotal } from '@/lib/gamification'
import { useOverdueTasks } from '@/hooks/useOverdueTasks'

// Create a query client outside the component to avoid recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false
    }
  }
})

type DecisionLogEntry = {
  id: string
  message: string
  timestamp: string
}

type UndoToast = {
  decisionId: string
  expiresAt: string
}

const todayIso = () => new Date().toISOString().split('T')[0]
const MAX_COGNITIVE_LOAD = 5
const DEFAULT_COGNITIVE_LOAD = 3
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

// Inner content component (will be wrapped with QueryClientProvider)
function DayAssistantV2Content() {
  const { showToast } = useToast()
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [assistant, setAssistant] = useState<any>(null)
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null)
  const [tasks, setTasks] = useState<TestDayTask[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedDate] = useState<string>(todayIso())
  const [contextFilter, setContextFilter] = useState<ContextType | 'all'>('all')
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([])
  const [warningTask, setWarningTask] = useState<TestDayTask | null>(null)
  const [warningDetails, setWarningDetails] = useState<{ title: string; message: string; details: string[] } | null>(null)
  const [selectedTask, setSelectedTask] = useState<TestDayTask | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskEstimate, setNewTaskEstimate] = useState(25)
  const [newTaskLoad, setNewTaskLoad] = useState(2)
  const [newTaskMust, setNewTaskMust] = useState(false)
  const [newTaskContext, setNewTaskContext] = useState<TaskContext>('deep_work')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [clarifyTask, setClarifyTask] = useState<TestDayTask | null>(null)
  const [showLaterQueue, setShowLaterQueue] = useState(false)
  const [showRestOfQueue, setShowRestOfQueue] = useState(false)
  const [isReorderingQueue, setIsReorderingQueue] = useState(false)
  
  // NEW: Work mode state (replaces energy/focus sliders)
  const [workMode, setWorkMode] = useState<WorkMode>('focus')
  
  // NEW: Help me modal state
  const [helpMeTask, setHelpMeTask] = useState<TestDayTask | null>(null)
  
  // NEW: Add time block modal state
  const [showAddTimeBlockModal, setShowAddTimeBlockModal] = useState(false)
  const [manualTimeBlock, setManualTimeBlock] = useState<number>(0) // Additional minutes added by user
  
  // NEW: Break timer state
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [breakActive, setBreakActive] = useState(false)
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0)
  
  // NEW: Quick add modal state
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  
  // Track applied recommendation IDs to filter them out
  // Load from localStorage on mount and persist on change
  const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('appliedRecommendationIds')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            return new Set(parsed)
          }
        } catch (e) {
          console.error('Failed to parse applied recommendation IDs from localStorage:', e)
        }
      }
    }
    return new Set()
  })
  
  // Persist applied recommendation IDs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appliedRecommendationIds', JSON.stringify(Array.from(appliedRecommendationIds)))
    }
  }, [appliedRecommendationIds])
  
  // Clean up old applied recommendation IDs (older than 24 hours)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastCleanup = localStorage.getItem('lastRecommendationCleanup')
      const now = Date.now()
      
      if (!lastCleanup || now - parseInt(lastCleanup) > CLEANUP_INTERVAL_MS) {
        // Clear all applied IDs after 24 hours
        setAppliedRecommendationIds(new Set())
        localStorage.setItem('lastRecommendationCleanup', now.toString())
      }
    }
  }, [])
  
  const undoTimer = useRef<NodeJS.Timeout | null>(null)

  // React Query Mutations - NO MORE loadDayPlan() calls!
  const completeTaskMutation = useCompleteTask()
  const deleteTaskMutation = useDeleteTask()
  const pinTaskMutation = useTogglePinTask()
  const postponeTaskMutation = usePostponeTask()
  const toggleSubtaskMutation = useToggleSubtask()
  const acceptRecommendationMutation = useAcceptRecommendation()

  // Timer hook
  const {
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
    progressPercentage
  } = useTaskTimer()

  // Recommendations hook - fetches live recommendations
  const { recommendations, loading: recLoading, refresh: refreshRecs } = useRecommendations({
    sessionToken,
    selectedDate,
    energy: dayPlan?.energy || 3,
    focus: dayPlan?.focus || 3,
    tasks,
    contextFilter,
    enabled: !!sessionToken
  })
  
  // Filter out applied recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => !appliedRecommendationIds.has(rec.id))
  }, [recommendations, appliedRecommendationIds])

  useEffect(() => {
    const init = async () => {
      console.log('[DayAssistantV2] Component mounted - starting initialization')
      
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[DayAssistantV2] Session check completed:', session ? 'SESSION EXISTS' : 'NO SESSION')
      
      if (!session) {
        console.warn('[DayAssistantV2] No session found - user not authenticated')
        showToast('Musisz być zalogowany, aby korzystać z Asystenta Dnia v2', 'error')
        setLoading(false)
        return
      }
      
      const token = session.access_token
      if (process.env.NODE_ENV === 'development') {
        console.log('[DayAssistantV2] Token exists:', token ? 'YES' : 'NO')
        console.log('[DayAssistantV2] Token length:', token?.length || 0)
      }
      
      setSessionToken(token)
      console.log('[DayAssistantV2] Calling loadDayPlan() with token from session')
      await loadDayPlan(token)
    }
    init()

    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Background sync every 30 seconds - NO AUTO RELOAD
  // Tasks will be refetched only when explicitly invalidated via mutations
  useEffect(() => {
    if (!sessionToken) return
    
    const doSyncAndRefresh = async () => {
      try {
        const response = await syncTodoist(sessionToken)
        if (response.ok) {
          const data = await response.json()
          // Background sync runs silently - mutations handle cache invalidation
          if (!data.skipped && (data.success_count > 0 || data.synced_at)) {
            console.log('[DayAssistantV2] Background sync completed with changes')
            // Instead of full reload, just invalidate recommendations
            // Tasks are managed via local state + mutations
          } else if (data.skipped) {
            console.log('[DayAssistantV2] Sync skipped (debounced), no reload needed')
          }
        }
      } catch (err) {
        console.error('[DayAssistantV2] Background sync failed:', err)
      }
    }
    
    // Sync every 60 seconds (increased from 30s to reduce server load)
    const interval = setInterval(doSyncAndRefresh, 60000)
    
    return () => clearInterval(interval)
  }, [sessionToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic requeue on energy/focus change - NO RELOAD NEEDED
  // Queue updates automatically via useMemo dependencies
  useEffect(() => {
    if (dayPlan && sessionToken) {
      console.log('[DayAssistantV2] Energy/Focus changed, triggering requeue')
      addDecisionLog('Kolejka zaktualizowana po zmianie energii/skupienia')
    }
  }, [dayPlan?.energy, dayPlan?.focus]) // eslint-disable-line react-hooks/exhaustive-deps

  // REMOVED: Periodic 15-min reload - unnecessary with reactive queue
  // Queue automatically recalculates based on time via useMemo

  // 🎮 GAMIFICATION: Keyboard shortcut for quick add (Ctrl/Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowQuickAdd(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 🎤 VOICE RAMBLE: Listen for voice tasks saved and refresh queue
  useEffect(() => {
    const handleVoiceTasksSaved = async () => {
      console.log('🎤 [DayAssistantV2] Voice tasks saved - refreshing queue')
      if (sessionToken) {
        await loadDayPlan(sessionToken)
        showToast('Zadania głosowe dodane do kolejki', 'success')
      }
    }

    window.addEventListener('voice-tasks-saved', handleVoiceTasksSaved)
    return () => window.removeEventListener('voice-tasks-saved', handleVoiceTasksSaved)
  }, [sessionToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // ➕ GLOBAL QUICK ADD: Listen for tasks added via global quick add
  useEffect(() => {
    const handleTaskAdded = async (e: Event) => {
      const customEvent = e as CustomEvent
      console.log('🎉 Task added via global quick add:', customEvent.detail?.task)
      
      // Add to local state if task is provided
      if (customEvent.detail?.task) {
        setTasks(prev => [...prev, customEvent.detail.task])
      }
      
      // Refresh full list to ensure consistency
      if (sessionToken) {
        await loadDayPlan(sessionToken)
      }
    }
    
    window.addEventListener('task-added', handleTaskAdded)
    return () => window.removeEventListener('task-added', handleTaskAdded)
  }, [sessionToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const authFetch = async (url: string, options: RequestInit = {}) => {
    // Get fresh token from Supabase to avoid JWT expiration issues
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('[DayAssistantV2] No active session')
      showToast('Sesja wygasła. Zaloguj się ponownie.', 'error')
      throw new Error('Brak sesji')
    }
    
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
    return fetch(url, { ...options, headers })
  }

  const loadDayPlan = async (token?: string) => {
    console.log('[DayAssistantV2] loadDayPlan() called')
    if (process.env.NODE_ENV === 'development') {
      console.log('[DayAssistantV2] - token parameter:', token ? 'PROVIDED' : 'NOT PROVIDED')
      console.log('[DayAssistantV2] - sessionToken state:', sessionToken ? 'EXISTS' : 'NULL')
    }
    
    try {
      setLoading(true)
      const authHeader = token || sessionToken
      
      console.log('[DayAssistantV2] authHeader resolved:', authHeader ? 'EXISTS' : 'MISSING')
      
      if (!authHeader) {
        console.error('[DayAssistantV2] ❌ No auth header available - cannot fetch day plan')
        console.error('[DayAssistantV2] This means both token parameter and sessionToken state are null/undefined')
        showToast('Brak autoryzacji - spróbuj odświeżyć stronę', 'error')
        return
      }
      
      // ✨ STEP 1: Call sync (cache-aware, coordinated)
      await syncTodoist(authHeader)
        .catch(err => console.warn('[DayAssistantV2] Sync warning:', err))
      
      // ✨ STEP 2: Fetch day plan (getTasks reads from day_assistant_v2_tasks)
      const url = `/api/day-assistant-v2/dayplan?date=${selectedDate}`
      console.log('[DayAssistantV2] Fetching day plan from:', url)
      console.log('[DayAssistantV2] Selected date:', selectedDate)
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${authHeader}` }
      })
      
      console.log('[DayAssistantV2] Response received - status:', response.status, response.statusText)
      
      if (!response.ok) {
        console.error('[DayAssistantV2] ❌ API request failed with status:', response.status)
        let errorMessage = 'Nie udało się pobrać planu dnia'
        try {
          const errorData = await response.json()
          console.error('[DayAssistantV2] Error response data:', errorData)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          console.error('[DayAssistantV2] Could not parse error response as JSON')
        }
        showToast(errorMessage, 'error')
        return
      }
      
      const data = await response.json()
      console.log('[DayAssistantV2] ✅ Day plan loaded successfully')
      console.log('[DayAssistantV2] - Assistant:', data.assistant ? 'LOADED' : 'MISSING')
      console.log('[DayAssistantV2] - Day plan:', data.dayPlan ? 'LOADED' : 'MISSING')
      console.log('[DayAssistantV2] - Tasks count:', data.tasks?.length || 0)
      console.log('[DayAssistantV2] - Proposals count:', data.proposals?.length || 0)
      
      if (data.tasks && data.tasks.length > 0) {
        console.log('[DayAssistantV2] Tasks preview:', data.tasks.slice(0, 3).map((t: TestDayTask) => ({
          id: t.id,
          title: t.title,
          is_must: t.is_must,
          due_date: t.due_date
        })))
      }
      
      setAssistant(data.assistant)
      setDayPlan(data.dayPlan)
      setTasks(data.tasks || [])
      setProposals(data.proposals || [])
      
      console.log('[DayAssistantV2] State updated successfully')
    } catch (error) {
      console.error('[DayAssistantV2] ❌ Exception in loadDayPlan:', error)
      if (error instanceof Error) {
        console.error('[DayAssistantV2] Error name:', error.name)
        console.error('[DayAssistantV2] Error message:', error.message)
        console.error('[DayAssistantV2] Error stack:', error.stack)
      }
      showToast('Wystąpił błąd podczas ładowania planu dnia', 'error')
    } finally {
      setLoading(false)
      console.log('[DayAssistantV2] loadDayPlan() completed, loading state set to false')
    }
  }

  const filteredTasks = useMemo(() => {
    // Don't filter by due_date here - allow overdue tasks to pass through
    // The overdue filtering will be done later by useOverdueTasks hook
    let filtered = tasks.filter(t => 
      (contextFilter === 'all' || t.context_type === contextFilter) &&
      !t.completed
    )
    
    // Apply work mode filtering
    if (workMode === 'low_focus') {
      filtered = filtered.filter(t => t.cognitive_load <= 2)
    } else if (workMode === 'quick_wins') {
      filtered = filtered.filter(t => t.estimate_min <= 20)
    }
    
    return filtered
  }, [tasks, contextFilter, workMode])

  // Apply intelligent scoring to filtered tasks
  const scoredTasks = useScoredTasks(filteredTasks, dayPlan, selectedDate)

  // Use overdue tasks hook for better management
  const { overdueTasks } = useOverdueTasks(scoredTasks, selectedDate)

  // Non-overdue tasks for queue
  const nonOverdueTasks = useMemo(() => {
    return scoredTasks.filter(t => !t.due_date || t.due_date >= selectedDate)
  }, [scoredTasks, selectedDate])

  // Use queue hook to calculate queue (with manual time block)
  const { queue, later, availableMinutes, usedMinutes, usagePercentage } = useTaskQueue(
    nonOverdueTasks,
    dayPlan,
    manualTimeBlock
  )

  // 🔍 DEBUG LOGGING for queue state
  useEffect(() => {
    console.log('📊 [Queue Debug]', {
      totalTasks: tasks.length,
      filteredTasks: filteredTasks.length,
      scoredTasks: scoredTasks.length,
      overdueTasks: overdueTasks.length,
      nonOverdueTasks: nonOverdueTasks.length,
      queueTasks: queue.length,
      laterTasks: later.length,
      availableMinutes,
      usedMinutes
    })
    
    if (overdueTasks.length > 0) {
      console.log('⚠️ [Overdue Tasks]', overdueTasks.map(t => ({
        title: t.title,
        due_date: t.due_date,
        days_overdue: t.due_date ? Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
      })))
    }
    
    if (later.length > 0) {
      console.log('📋 [Later Tasks]', later.map(t => ({
        title: t.title,
        estimate: t.estimate_min,
        score: (t as any)._score || 'N/A'
      })))
    }
  }, [tasks.length, filteredTasks.length, scoredTasks.length, overdueTasks, nonOverdueTasks.length, queue.length, later, availableMinutes, usedMinutes])

  const mustTasks = queue.filter(t => t.is_must).slice(0, 3)
  const matchedTasks = queue.filter(t => !t.is_must && !t.completed)
  const autoMoved = scoredTasks.filter(t => t.auto_moved)

  const lightUsage = useMemo(() => {
    if (!assistant) return null
    return checkLightTaskLimit(filteredTasks, assistant)
  }, [assistant, filteredTasks])
  
  // Memoize easiest task calculation for fallback display
  const easiestTask = useMemo(() => {
    const candidates = tasks.filter(t => !t.completed)
    if (candidates.length === 0) return null
    return [...candidates].sort((a, b) => {
      const loadDiff = (a.cognitive_load ?? DEFAULT_COGNITIVE_LOAD) - (b.cognitive_load ?? DEFAULT_COGNITIVE_LOAD)
      if (loadDiff !== 0) return loadDiff
      return getSmartEstimate(a) - getSmartEstimate(b)
    })[0]
  }, [tasks])

  const addDecisionLog = (message: string) => {
    setDecisionLog(prev => [
      {
        id: `${Date.now()}`,
        message,
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ].slice(0, 12))
  }

  const handleAddTimeBlock = (minutes: number) => {
    setManualTimeBlock(prev => prev + minutes)
    addDecisionLog(`Dodano blok czasu: ${minutes} min`)
    setIsReorderingQueue(true)
    setTimeout(() => setIsReorderingQueue(false), 300)
  }

  const handleSaveConfig = async (config: {
    work_start_time: string
    work_end_time: string
    ai_instructions: string
  }) => {
    const response = await authFetch('/api/day-assistant-v2/config', {
      method: 'POST',
      body: JSON.stringify({
        work_start_time: config.work_start_time,
        work_end_time: config.work_end_time,
        ai_instructions: config.ai_instructions,
        plan_date: selectedDate
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      setDayPlan(data.dayPlan)
      showToast('✅ Konfiguracja zapisana', 'success')
      addDecisionLog('Zaktualizowano godziny pracy')
    } else {
      showToast('Nie udało się zapisać konfiguracji', 'error')
    }
  }

  const updateSliders = async (field: 'energy' | 'focus', value: number) => {
    if (!dayPlan) return
    
    // Set loading state for instant feedback
    setIsReorderingQueue(true)
    setDayPlan(prev => prev ? { ...prev, [field]: value } : prev)
    
    // Clear loading after a short delay (instant visual feedback)
    setTimeout(() => setIsReorderingQueue(false), 300)
    
    const response = await authFetch('/api/day-assistant-v2/dayplan', {
      method: 'POST',
      body: JSON.stringify({ date: selectedDate, [field]: value })
    })
    if (response.ok) {
      const data = await response.json()
      setDayPlan(data.dayPlan)
      if (data.proposal) {
        setProposals(prev => [data.proposal, ...prev].slice(0, 3))
      }
      addDecisionLog(`Zmieniono ${field === 'energy' ? 'energię' : 'skupienie'} na ${value}`)
    }
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      showToast('Podaj tytuł zadania', 'warning')
      return
    }
    const response = await authFetch('/api/day-assistant-v2/task', {
      method: 'POST',
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        estimate_min: newTaskEstimate,
        cognitive_load: newTaskLoad,
        is_must: newTaskMust,
        is_important: newTaskMust,
        due_date: selectedDate,
        context_type: newTaskContext,
        priority: 3
      })
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      showToast(err.message || 'Nie udało się dodać zadania', 'error')
      return
    }
    const data = await response.json()
    setTasks(prev => [...prev, data.task])
    if (data.proposal) {
      setProposals(prev => [data.proposal, ...prev].slice(0, 3))
    }
    setNewTaskTitle('')
    addDecisionLog(`Dodano zadanie "${data.task.title}"`)
    
    // 🎮 GAMIFICATION: Recalculate daily stats after adding task
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await recalculateDailyTotal(user.id)
    }
  }

  // 🎮 GAMIFICATION: Quick add handler
  const handleQuickAdd = async (task: {
    title: string
    estimateMin: number
    context: TaskContext
    isMust: boolean
  }) => {
    const response = await authFetch('/api/day-assistant-v2/task', {
      method: 'POST',
      body: JSON.stringify({
        title: task.title,
        estimate_min: task.estimateMin,
        cognitive_load: 2,
        is_must: task.isMust,
        is_important: task.isMust,
        due_date: selectedDate,
        context_type: task.context,
        priority: 3
      })
    })

    if (!response.ok) {
      showToast('Nie udało się dodać zadania', 'error')
      return
    }

    const data = await response.json()
    setTasks(prev => [...prev, data.task])
    showToast('✅ Zadanie dodane!', 'success')
    addDecisionLog(`Dodano zadanie "${data.task.title}"`)
    
    // 🎮 GAMIFICATION: Recalculate daily stats after adding task
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await recalculateDailyTotal(user.id)
    }
  }

  const handleNotToday = async (task: TestDayTask, reason = 'Nie dziś') => {
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== task.id))
    addDecisionLog(`Przeniesiono "${task.title}" na jutro`)
    
    try {
      const response = await authFetch('/api/day-assistant-v2/postpone', {
        method: 'POST',
        body: JSON.stringify({ task_id: task.id, reason, reserve_morning: true })
      })
      
      if (!response.ok) {
        showToast('Nie udało się przenieść zadania', 'error')
        return
      }
      
      const data = await response.json()
      if (data.proposal) {
        setProposals(prev => [data.proposal, ...prev].slice(0, 3))
      }
      
      if (data.undo_window_expires && data.decision_log_id) {
        setUndoToast({ decisionId: data.decision_log_id, expiresAt: data.undo_window_expires })
        if (undoTimer.current) clearTimeout(undoTimer.current)
        const ttl = Math.max(5000, new Date(data.undo_window_expires).getTime() - Date.now())
        undoTimer.current = setTimeout(() => setUndoToast(null), Math.min(ttl, 15000))
      }
    } catch (error) {
      console.error('Postpone error:', error)
    }
  }

  const handleUndo = async () => {
    const response = await authFetch('/api/day-assistant-v2/undo', { method: 'POST' })
    if (response.ok) {
      // Undo may affect multiple entities - refetch tasks and proposals
      toast.success('↩️ Cofnięto ostatnią akcję')
      setUndoToast(null)
      addDecisionLog('Cofnięto ostatnią akcję')
      
      if (sessionToken) {
        const tasksResponse = await authFetch(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
        if (tasksResponse.ok) {
          const data = await tasksResponse.json()
          setTasks(data.tasks || [])
          setProposals(data.proposals || [])
          setDayPlan(data.dayPlan || null)
        }
      }
    } else {
      toast.error('Nie udało się cofnąć')
    }
  }

  const openUnmarkWarning = (task: TestDayTask) => {
    const warning = generateUnmarkMustWarning(task)
    setWarningTask(task)
    setWarningDetails(warning)
  }

  const confirmUnmark = async (action: 'confirm' | 'apply_recommendation') => {
    if (!warningTask) return
    if (action === 'apply_recommendation') {
      await handleNotToday(warningTask, 'Odznaczono MUST - rekomendacja przeniesienia')
    } else {
      const response = await authFetch('/api/day-assistant-v2/task', {
        method: 'PUT',
        body: JSON.stringify({ task_id: warningTask.id, is_must: false })
      })
      if (!response.ok) {
        showToast('Nie udało się odznaczyć MUST', 'error')
      } else {
        setTasks(prev => prev.map(t => t.id === warningTask.id ? { ...t, is_must: false } : t))
        addDecisionLog(`Odznaczono MUST dla "${warningTask.title}"`)
      }
    }
    setWarningTask(null)
    setWarningDetails(null)
  }

  const handleProposalResponse = async (proposalId: string, action: 'accept_primary' | 'accept_alt' | 'reject', alternativeIndex?: number, rejectReason?: string) => {
    // Optimistic update - remove proposal from list
    setProposals(prev => prev.filter(p => p.id !== proposalId))
    
    if (action === 'reject' && rejectReason) {
      addDecisionLog(`Odrzucono rekomendację: ${rejectReason}`)
      toast.info(`Odrzucono: ${rejectReason}`)
    } else {
      addDecisionLog(`Obsłużono rekomendację (${action})`)
    }
    
    try {
      const response = await acceptRecommendationMutation.mutateAsync({
        proposalId,
        action,
        alternativeIndex,
        rejectReason
      })
      
      // If recommendation affected tasks, refresh task list without full reload
      if (response && sessionToken) {
        const tasksResponse = await authFetch(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
        if (tasksResponse.ok) {
          const data = await tasksResponse.json()
          setTasks(data.tasks || [])
          setProposals(data.proposals || [])
        }
      }
    } catch (error) {
      console.error('Proposal response error:', error)
    }
  }

  const handleComplete = async (task: TestDayTask) => {
    // Stop timer if this task is active
    if (activeTimer && activeTimer.taskId === task.id) {
      stopTimer()
    }

    // Use mutation - no more loadDayPlan!
    setTasks(prev => prev.filter(t => t.id !== task.id))
    addDecisionLog(`Oznaczono "${task.title}" jako wykonane`)
    
    try {
      await completeTaskMutation.mutateAsync(task.id)
      
      // 🎮 GAMIFICATION: Update streak and stats
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Update streak and get milestone
        const milestone = await updateStreakOnCompletion(user.id)
        
        // Update daily stats
        await updateDailyStats(user.id, true)
        
        // Trigger confetti animation
        triggerConfetti()
        
        // Show milestone toast if any
        if (milestone?.milestone) {
          triggerMilestoneToast(milestone.milestone, showToast)
        }
      }
    } catch (error) {
      // Rollback on error
      console.error('Complete task error:', error)
    }
  }

  const handleStartTask = (task: TestDayTask) => {
    startTimer(task)
    addDecisionLog(`Rozpoczęto timer dla "${task.title}"`)
  }

  const handleTimerComplete = async () => {
    if (!activeTimer) return
    
    const task = tasks.find(t => t.id === activeTimer.taskId)
    if (task) {
      // For now, just complete the task
      // TODO: Show completion dialog with options
      await handleComplete(task)
    }
  }

  const handleTimerStop = () => {
    if (!activeTimer) return
    
    const task = tasks.find(t => t.id === activeTimer.taskId)
    stopTimer()
    addDecisionLog(`Zatrzymano timer dla "${task?.title || 'zadania'}"`)
  }

  const handleKeepOverdueToday = (task: TestDayTask) => {
    addDecisionLog(`Zachowano przeterminowane zadanie "${task.title}" na dziś`)
    showToast('Zadanie pozostanie w kolejce', 'info')
  }

  const handlePostponeOverdue = async (task: TestDayTask) => {
    // For now, postpone to tomorrow
    // TODO: Show date picker modal
    await handleNotToday(task, 'Przełożono przeterminowane zadanie')
  }

  // Morning Review Modal handlers
  const handleMorningAddToday = async (task: TestDayTask) => {
    // Update task due_date to today so it stays in today's queue
    const todayDate = todayIso()
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, due_date: todayDate } : t
    ))
    
    addDecisionLog(`Dodano przeterminowane zadanie "${task.title}" na dziś`)
    toast.success(`✅ "${task.title}" dodane na dziś`)
    
    try {
      const response = await authFetch('/api/day-assistant-v2/task', {
        method: 'PUT',
        body: JSON.stringify({ 
          task_id: task.id, 
          due_date: todayDate 
        })
      })
      
      if (!response.ok) {
        // Rollback on error
        setTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, due_date: task.due_date } : t
        ))
        toast.error('Nie udało się zaktualizować zadania')
      }
    } catch (error) {
      console.error('Update task due date error:', error)
      // Rollback on error
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, due_date: task.due_date } : t
      ))
    }
  }

  const handleMorningMoveToTomorrow = async (task: TestDayTask) => {
    await handleNotToday(task, 'Przełożono na jutro z porannego przeglądu')
    toast.success('📅 Zadanie przeniesione na jutro')
  }

  const handleMorningReschedule = async (task: TestDayTask) => {
    // For now, same as postpone - could open date picker in future
    await handleNotToday(task, 'Przełożono z porannego przeglądu')
    toast.success('📅 Zadanie przełożone')
  }

  const handleMorningDelete = async (task: TestDayTask) => {
    await handleDelete(task)
    toast.success('🗑️ Zadanie usunięte')
  }


  const handlePin = async (task: TestDayTask) => {
    const newPinState = !task.is_must
    
    // Check if trying to pin when already at limit (client-side check)
    if (newPinState) {
      const currentPinnedCount = tasks.filter(t => t.is_must).length
      if (currentPinnedCount >= 3) {
        toast.warning('Maksymalnie 3 zadania MUST! Odepnij coś najpierw.')
        return
      }
    }
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_must: newPinState } : t))
    addDecisionLog(`${newPinState ? 'Przypięto' : 'Odpięto'} "${task.title}"`)
    
    try {
      await pinTaskMutation.mutateAsync({ taskId: task.id, pin: newPinState })
    } catch (error) {
      // Rollback handled by mutation
      console.error('Pin task error:', error)
    }
  }

  const handleDecompose = async (task: TestDayTask) => {
    // Show the HelpMeModal for AI-powered step generation
    setHelpMeTask(task)
  }

  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    // Helper function to check if all subtasks are completed
    const checkAllSubtasksCompleted = (subtasks: any[], updatedSubtaskId: string) => {
      return subtasks.map(sub =>
        sub.id === updatedSubtaskId ? { ...sub, completed: true } : sub
      ).every(sub => sub.completed)
    }
    
    // Find the task containing this subtask
    const parentTask = tasks.find(task => 
      task.subtasks?.some(sub => sub.id === subtaskId)
    )
    
    // Update local state optimistically
    setTasks(prev => prev.map(task => {
      if (task.subtasks?.some(sub => sub.id === subtaskId)) {
        const updatedSubtasks = task.subtasks.map(sub =>
          sub.id === subtaskId ? { ...sub, completed } : sub
        )
        
        return {
          ...task,
          subtasks: updatedSubtasks
        }
      }
      return task
    }))
    
    try {
      await toggleSubtaskMutation.mutateAsync({ subtaskId, completed })
      
      // After successful subtask toggle, check if all subtasks are completed
      if (parentTask && completed && parentTask.subtasks) {
        const allSubtasksCompleted = checkAllSubtasksCompleted(parentTask.subtasks, subtaskId)
        
        if (allSubtasksCompleted) {
          // Auto-complete the parent task after successful subtask update
          await handleComplete(parentTask)
          toast.success('🎉 Wszystkie kroki ukończone! Zadanie zostało ukończone.')
        }
      }
    } catch (error) {
      console.error('Toggle subtask error:', error)
    }
  }

  const performTaskDeletion = async (task: TestDayTask) => {
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== task.id))
    addDecisionLog(`Usunięto zadanie "${task.title}"`)
    
    // Filter out recommendations mentioning this task
    setProposals(prev => prev.filter(p => {
      const mentionsTask = p.primary_action?.task_id === task.id ||
        p.alternatives?.some((a: any) => a.task_id === task.id)
      return !mentionsTask
    }))
    
    try {
      await deleteTaskMutation.mutateAsync(task.id)
    } catch (error) {
      console.error('Delete task error:', error)
    }
  }

  const handleDelete = async (task: TestDayTask) => {
    // Use toast for confirmation instead of browser alert
    toast(
      <div>
        <p className="font-semibold">Czy na pewno chcesz usunąć to zadanie?</p>
        <p className="text-sm text-gray-600 mt-1">{task.title}</p>
      </div>,
      {
        action: {
          label: 'Usuń',
          onClick: () => performTaskDeletion(task)
        },
        cancel: {
          label: 'Anuluj',
          onClick: () => {}
        }
      }
    )
  }

  // Handle break timer
  const handleAddBreak = () => {
    setShowBreakModal(true)
  }

  const handleStartBreak = (durationMinutes: number) => {
    // Pause active timer if running
    if (activeTimer && !activeTimer.isPaused) {
      pauseTimer()
    }
    
    setBreakActive(true)
    setBreakTimeRemaining(durationMinutes)
    addDecisionLog(`Przerwa ${durationMinutes} min rozpoczęta`)
  }

  // Handle apply recommendation
  const handleApplyRecommendation = async (recommendation: Recommendation) => {
    try {
      console.log('🔍 [Apply Recommendation] Starting:', recommendation.type)
      // Optimistically remove the recommendation from view
      setAppliedRecommendationIds(prev => new Set(prev).add(recommendation.id))
      
      const response = await authFetch('/api/day-assistant-v2/apply-recommendation', {
        method: 'POST',
        body: JSON.stringify({
          recommendation,
          date: selectedDate
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`✅ ${result.message}`)
        
        console.log('✅ [Apply Recommendation] Success, refreshing data...')
        
        // Refresh recommendations immediately (invalidate cache)
        await refreshRecs()
        
        // Refresh tasks WITHOUT full reload - just fetch updated task data
        if (sessionToken) {
          const tasksResponse = await authFetch(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
          if (tasksResponse.ok) {
            const data = await tasksResponse.json()
            setTasks(data.tasks || [])
            setProposals(data.proposals || [])
          } else {
            console.warn('⚠️ [Apply Recommendation] Failed to refresh tasks after applying recommendation')
            toast.warning('Rekomendacja zastosowana, ale nie udało się odświeżyć listy zadań. Odśwież stronę.')
          }
        }
        
        addDecisionLog(`Zastosowano rekomendację: ${recommendation.title}`)
        
        // Handle ADD_BREAK action
        const breakAction = recommendation.actions.find(a => a.op === 'ADD_BREAK')
        if (breakAction && breakAction.durationMinutes) {
          handleStartBreak(breakAction.durationMinutes)
        }
      } else {
        console.error('❌ [Apply Recommendation] Failed:', result.error)
        toast.error(`❌ ${result.error || 'Nie udało się zastosować rekomendacji'}`)
        // Rollback - remove from applied set if failed
        setAppliedRecommendationIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(recommendation.id)
          return newSet
        })
      }
    } catch (error) {
      console.error('❌ [Apply Recommendation] Error:', error)
      toast.error('Błąd podczas stosowania rekomendacji')
      // Rollback on error
      setAppliedRecommendationIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(recommendation.id)
        return newSet
      })
    }
  }

  const presetButtons = (
    <div className="flex flex-wrap gap-2">
      {Object.values(ENERGY_FOCUS_PRESETS).map(preset => (
        <Button
          key={preset.name}
          variant="ghost"
          onClick={() => {
            updateSliders('energy', preset.energy)
            updateSliders('focus', preset.focus)
          }}
        >
          {preset.name}
        </Button>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-purple mx-auto mb-4" />
          <p className="text-muted-foreground">Ładowanie Asystenta Dnia v2...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Main content area with improved spacing */}
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
              <CardTitle className="text-3xl text-brand-purple">Asystent Dnia v2</CardTitle>
              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Konfiguracja dnia pracy"
              >
                <Gear size={24} className="text-gray-600" />
              </button>
            </div>
            
            {/* 🎮 GAMIFICATION: Streak Display and Progress Ring */}
            <div className="flex flex-wrap items-center gap-4">
              <StreakDisplay />
              <ProgressRing />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 🔍 DEBUG PANEL - Development only */}
            {process.env.NODE_ENV === 'development' && (
              <Card className="border-2 border-yellow-500 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-sm text-yellow-800">🔍 Debug Panel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><strong>Total tasks:</strong> {tasks.length}</div>
                    <div><strong>Filtered tasks:</strong> {filteredTasks.length}</div>
                    <div><strong>Scored tasks:</strong> {scoredTasks.length}</div>
                    <div><strong>Overdue tasks:</strong> {overdueTasks.length}</div>
                    <div><strong>Queue tasks:</strong> {queue.length}</div>
                    <div><strong>Later tasks:</strong> {later.length}</div>
                    <div><strong>Available min:</strong> {availableMinutes}</div>
                    <div><strong>Used min:</strong> {usedMinutes}</div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold text-xs">Raw Data</summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded">
{JSON.stringify({
  tasks: tasks.map(t => ({ id: t.id, title: t.title, due_date: t.due_date, completed: t.completed })),
  overdueTasks: overdueTasks.map(t => ({ title: t.title, due_date: t.due_date })),
  laterTasks: later.map(t => ({ title: t.title, estimate: t.estimate_min }))
}, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            )}

            {/* Current Activity Box */}
            <CurrentActivityBox
              activeTimer={activeTimer}
              taskTitle={activeTimer ? tasks.find(t => t.id === activeTimer.taskId)?.title : undefined}
              breakActive={breakActive}
              breakTimeRemaining={breakTimeRemaining}
              formatTime={formatTime}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onComplete={handleTimerComplete}
              onStop={handleTimerStop}
            />

            {/* Queue Stats */}
            {availableMinutes > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-900">
                    📊 KOLEJKA NA DZIŚ ({Math.floor(availableMinutes / 60)}h {availableMinutes % 60}min dostępne)
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddTimeBlockModal(true)}
                    className="text-xs"
                  >
                    ➕ Dodaj czas
                  </Button>
                </div>
                {manualTimeBlock > 0 && (
                  <p className="text-xs text-blue-600 mb-2">
                    💡 Dodano ręcznie: {manualTimeBlock} min
                  </p>
                )}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm text-blue-700 mb-1">
                    <span>⏱️ Wykorzystane: {Math.floor(usedMinutes / 60)}h {usedMinutes % 60}min / {Math.floor(availableMinutes / 60)}h {availableMinutes % 60}min</span>
                    <span>{usagePercentage}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
                {later.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    📋 {later.length} {later.length === 1 ? 'task' : 'tasków'} pozostaje na później
                  </p>
                )}
              </div>
            )}

            {/* Work Mode Selector */}
            <WorkModeSelector
              value={workMode}
              onChange={(mode) => {
                setWorkMode(mode)
                setIsReorderingQueue(true)
                setTimeout(() => setIsReorderingQueue(false), 300)
                addDecisionLog(`Zmieniono tryb pracy na ${mode}`)
              }}
              isUpdating={isReorderingQueue}
            />

            {/* Add Break Button */}
            <Card className="p-4">
              <Button
                onClick={handleAddBreak}
                variant="outline"
                className="w-full gap-2 border-green-300 hover:bg-green-50"
              >
                <Coffee size={20} />
                Dodaj przerwę
              </Button>
            </Card>
            {lightUsage?.exceeded && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                Po {lightUsage.minutes} min lekkich zadań zaplanuj jedną sesję MUST/deep. Limit: {lightUsage.limit} min.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks Section - ALWAYS VISIBLE */}
        <OverdueTasksSection
          overdueTasks={overdueTasks}
          selectedDate={selectedDate}
          onKeepToday={handleKeepOverdueToday}
          onPostpone={handlePostponeOverdue}
          debugInfo={{
            totalTasks: tasks.length,
            filteredTasks: filteredTasks.length,
            scoredTasks: scoredTasks.length,
            tasksWithDueDate: tasks.filter(t => t.due_date).length,
            tasksBeforeToday: tasks.filter(t => t.due_date && t.due_date < selectedDate).length
          }}
        />

        {autoMoved.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4 space-y-2">
              <div className="font-semibold text-amber-800">Przeniesione wczoraj — {autoMoved.length}x</div>
              {autoMoved.map(task => (
                <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-lg p-3 border">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">Powód: {task.moved_reason || 'Nightly rollover'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => showToast(`Start 10 min dla "${task.title}"`, 'info')}>Zacznij 10 min</Button>
                    <Button size="sm" variant="outline" onClick={() => handleNotToday(task, 'Przeniesione wczoraj - kolejny dzień')}>Przenieś dalej</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleComplete(task)}>Oznacz jako wykonane</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* MUST Tasks Section */}
        {mustTasks.length > 0 && (
          <Card className="border-brand-purple/40 relative shadow-md">
            {isReorderingQueue && <QueueReorderingOverlay />}
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <span>📌</span>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  MUST (najpilniejsze)
                </span>
                <Badge variant="purple" className="bg-purple-100 text-purple-800 font-semibold px-3 py-1">
                  {mustTasks.length}/3
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mustTasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  queuePosition={index + 1}
                  onNotToday={() => handleNotToday(task)}
                  onStart={() => handleStartTask(task)}
                  onUnmark={() => openUnmarkWarning(task)}
                  onDecompose={() => handleDecompose(task)}
                  onComplete={() => handleComplete(task)}
                  onPin={() => handlePin(task)}
                  onDelete={() => handleDelete(task)}
                  onClick={() => setSelectedTask(task)}
                  focus={dayPlan?.focus || 3}
                  selectedDate={selectedDate}
                  activeTimer={activeTimer?.taskId === task.id ? activeTimer : undefined}
                  onPauseTimer={pauseTimer}
                  onResumeTimer={resumeTimer}
                  onCompleteTimer={handleTimerComplete}
                  onSubtaskToggle={handleSubtaskToggle}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top 3 Queue Section */}
        {matchedTasks.length > 0 && (
          <Card className="relative shadow-md">
            {isReorderingQueue && <QueueReorderingOverlay />}
            <CardHeader>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                📊 Kolejka na dziś (Top 3)
                <Badge variant="purple" className="bg-purple-100 text-purple-800 font-semibold px-3 py-1">
                  {Math.min(matchedTasks.length, 3)} zadań
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {matchedTasks.slice(0, 3).map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  queuePosition={mustTasks.length + index + 1}
                  onNotToday={() => handleNotToday(task)}
                  onStart={() => handleStartTask(task)}
                  onUnmark={() => openUnmarkWarning(task)}
                  onDecompose={() => handleDecompose(task)}
                  onComplete={() => handleComplete(task)}
                  onPin={() => handlePin(task)}
                  onDelete={() => handleDelete(task)}
                  onClick={() => setSelectedTask(task)}
                  focus={dayPlan?.focus || 3}
                  selectedDate={selectedDate}
                  activeTimer={activeTimer?.taskId === task.id ? activeTimer : undefined}
                  onPauseTimer={pauseTimer}
                  onResumeTimer={resumeTimer}
                  onCompleteTimer={handleTimerComplete}
                  onSubtaskToggle={handleSubtaskToggle}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Rest of Queue (expandable) - Tasks #4+ in today's queue */}
        {matchedTasks.length > 3 && (
          <Card className="relative border-gray-300 bg-gray-50 shadow-sm">
            {isReorderingQueue && <QueueReorderingOverlay />}
            <CardHeader 
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setShowRestOfQueue(!showRestOfQueue)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                  📋 Pozostałe w kolejce dzisiaj
                  <Badge variant="secondary" className="bg-gray-200 text-gray-700 font-semibold px-3 py-1">
                    {matchedTasks.length - 3} zadań
                  </Badge>
                </CardTitle>
                <CaretDown className={cn(
                  "transition-transform text-gray-600",
                  showRestOfQueue && "rotate-180"
                )} size={24} />
              </div>
            </CardHeader>
            {showRestOfQueue && (
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Te zadania są w kolejce na dziś, ale poza Top 3.
                </p>
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  {matchedTasks.slice(3).map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      queuePosition={mustTasks.length + 3 + index + 1}
                      onNotToday={() => handleNotToday(task)}
                      onStart={() => handleStartTask(task)}
                      onUnmark={() => openUnmarkWarning(task)}
                      onDecompose={() => handleDecompose(task)}
                      onComplete={() => handleComplete(task)}
                      onPin={() => handlePin(task)}
                      onDelete={() => handleDelete(task)}
                      onClick={() => setSelectedTask(task)}
                      focus={dayPlan?.focus || 3}
                      selectedDate={selectedDate}
                      activeTimer={activeTimer?.taskId === task.id ? activeTimer : undefined}
                      onPauseTimer={pauseTimer}
                      onResumeTimer={resumeTimer}
                      onCompleteTimer={handleTimerComplete}
                      onSubtaskToggle={handleSubtaskToggle}
                      isCollapsed={true}
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Empty state or Low Focus fallback */}
        {mustTasks.length === 0 && matchedTasks.length === 0 && queue.length === 0 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-orange-800 mb-2">
                  <span aria-label="uśmiech">😊</span> Brak zadań pasujących do obecnego trybu
                </p>
                <p className="text-xs text-orange-700 mb-4">
                  W trybie Low Focus lub przy blokach czasu zacznij od najprostszego zadania
                </p>
              </div>
              
              {/* Show easiest task if available */}
              {easiestTask && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-orange-800">
                    <span aria-label="żarówka">💡</span> Najłatwiejsze zadanie:
                  </p>
                  <TaskRow
                    key={easiestTask.id}
                    task={easiestTask}
                    onNotToday={() => handleNotToday(easiestTask)}
                    onStart={() => handleStartTask(easiestTask)}
                    onUnmark={() => openUnmarkWarning(easiestTask)}
                    onDecompose={() => handleDecompose(easiestTask)}
                    onComplete={() => handleComplete(easiestTask)}
                    onPin={() => handlePin(easiestTask)}
                    onDelete={() => handleDelete(easiestTask)}
                    onClick={() => setSelectedTask(easiestTask)}
                    focus={dayPlan?.focus || 3}
                    selectedDate={selectedDate}
                    onSubtaskToggle={handleSubtaskToggle}
                  />
                  <div className="text-center mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHelpMeTask(easiestTask)}
                      className="border-brand-purple text-brand-purple hover:bg-brand-purple/10"
                      aria-label="Pomóż mi z tym zadaniem"
                    >
                      <MagicWand size={16} className="mr-2" />
                      <span aria-label="błyskawica">⚡</span> Pomóż mi z tym zadaniem
                    </Button>
                  </div>
                </div>
              )}
              
              {later.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Brak zadań do wykonania <span aria-label="świętowanie">🎉</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* 📋 LATER QUEUE - ALWAYS VISIBLE FOR DEBUGGING */}
        <Card className="border-2 border-blue-500 bg-blue-50 shadow-sm">
          <CardHeader 
            className="cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => setShowLaterQueue(!showLaterQueue)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                📋 Na później
                <Badge variant="secondary" className="bg-blue-600 text-white font-semibold px-3 py-1">
                  {later.length} zadań
                </Badge>
                {later.length === 0 && (
                  <span className="text-xs text-blue-600 ml-2">(debug: array is empty)</span>
                )}
              </CardTitle>
              <CaretDown className={cn(
                "transition-transform text-blue-600",
                showLaterQueue && "rotate-180"
              )} size={24} />
            </div>
          </CardHeader>
          {showLaterQueue && (
            <CardContent className="space-y-3">
              {later.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-blue-700 mb-2">
                    🔍 DEBUG: Brak zadań w kolejce &quot;later&quot;
                  </p>
                  <details className="text-xs text-left bg-white p-2 rounded">
                    <summary className="cursor-pointer font-semibold">Debug Info</summary>
                    <pre className="mt-2 overflow-auto">
{JSON.stringify({
  totalTasks: tasks.length,
  nonOverdueTasks: nonOverdueTasks.length,
  queueLength: queue.length,
  laterLength: later.length,
  availableMinutes,
  usedMinutes,
  usagePercentage
}, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <>
                  <p className="text-sm text-blue-700">
                    Te zadania nie mieszczą się w dostępnym czasie pracy dzisiaj.
                  </p>
                  
                  <div className="border-t pt-3 mt-2 border-blue-200">
                    {later.map((task, index) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        queuePosition={queue.length + index + 1}
                        onNotToday={() => handleNotToday(task)}
                        onStart={() => handleStartTask(task)}
                        onUnmark={() => openUnmarkWarning(task)}
                        onDecompose={() => handleDecompose(task)}
                        onComplete={() => handleComplete(task)}
                        onPin={() => handlePin(task)}
                        onDelete={() => handleDelete(task)}
                        onClick={() => setSelectedTask(task)}
                        focus={dayPlan?.focus || 3}
                        selectedDate={selectedDate}
                        onSubtaskToggle={handleSubtaskToggle}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dodaj zadanie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Tytuł zadania"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Estymat</span>
                <input
                  type="number"
                  min={5}
                  className="w-20 rounded-lg border px-2 py-2"
                  value={newTaskEstimate}
                  onChange={e => setNewTaskEstimate(Number(e.target.value))}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cognitive load</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-16 rounded-lg border px-2 py-2"
                  value={newTaskLoad}
                  onChange={e => setNewTaskLoad(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newTaskMust} onChange={e => setNewTaskMust(e.target.checked)} />
                  MUST (pinned)
                </label>
                <select
                  className="rounded-lg border px-3 py-2 text-sm"
                  value={newTaskContext}
                  onChange={e => setNewTaskContext(e.target.value as TaskContext)}
                >
                  {(Object.keys(CONTEXT_LABELS) as TaskContext[]).map(ctx => (
                    <option key={ctx} value={ctx}>
                      {CONTEXT_LABELS[ctx]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleCreateTask} className="w-full">Dodaj na dziś</Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <span>💡</span>
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Rekomendacje
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RecommendationPanel
              recommendations={filteredRecommendations}
              onApply={handleApplyRecommendation}
              loading={recLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DecisionLog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {decisionLog.length === 0 && <p className="text-sm text-muted-foreground">Brak decyzji — wszystkie akcje użytkownika są dozwolone, system stosuje soft-warnings i undo.</p>}
            {decisionLog.map(entry => (
              <div key={entry.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                <span>{entry.message}</span>
                <span className="text-muted-foreground">{entry.timestamp}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {undoToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-3">
            <span>Zadanie przeniesione na jutro — Cofnij</span>
            <Button size="sm" variant="outline" onClick={handleUndo}>Cofnij</Button>
          </div>
        </div>
      )}

      {warningTask && warningDetails && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold">{warningDetails.title}</p>
                <p className="text-sm text-muted-foreground">{warningDetails.message}</p>
              </div>
              <button onClick={() => { setWarningTask(null); setWarningDetails(null) }}>
                <XCircle size={22} />
              </button>
            </div>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {warningDetails.details.map(item => <li key={item}>{item}</li>)}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => confirmUnmark('confirm')}>Potwierdź odznaczenie</Button>
              <Button variant="outline" onClick={() => confirmUnmark('apply_recommendation')}>Zastosuj rekomendację</Button>
              <Button variant="ghost" onClick={() => { setWarningTask(null); setWarningDetails(null) }}>Cofnij</Button>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          selectedDate={selectedDate}
        />
      )}

      {/* Work Hours Config Modal */}
      <WorkHoursConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveConfig}
        initialConfig={{
          work_start_time: dayPlan?.metadata?.work_start_time as string | undefined,
          work_end_time: dayPlan?.metadata?.work_end_time as string | undefined,
          ai_instructions: dayPlan?.metadata?.ai_instructions as string | undefined
        }}
      />

      {/* Add Time Block Modal */}
      <AddTimeBlockModal
        isOpen={showAddTimeBlockModal}
        onClose={() => setShowAddTimeBlockModal(false)}
        onAddTimeBlock={handleAddTimeBlock}
      />

      {/* Help Me Modal for AI Step Generation */}
      {helpMeTask && (
        <HelpMeModal
          task={helpMeTask}
          open={!!helpMeTask}
          onClose={() => setHelpMeTask(null)}
          onSuccess={async () => {
            const taskId = helpMeTask.id
            setHelpMeTask(null)
            addDecisionLog(`Utworzono kroki dla "${helpMeTask.title}"`)
            toast.success('✅ Kroki utworzone!')
            
            // Refetch only tasks to show new subtasks (no full reload)
            if (sessionToken) {
              const tasksResponse = await authFetch(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
              if (tasksResponse.ok) {
                const data = await tasksResponse.json()
                setTasks(data.tasks || [])
              }
            }
          }}
        />
      )}
      
      {/* Keep Clarify Modal for backward compatibility */}
      {clarifyTask && (
        <ClarifyModal
          task={clarifyTask}
          onClose={() => setClarifyTask(null)}
          onSubmit={async () => {
            const taskTitle = clarifyTask.title
            setClarifyTask(null)
            addDecisionLog(`Utworzono pierwszy krok dla "${taskTitle}"`)
            toast.success('✅ Pierwszy krok utworzony')
            
            // Refetch only tasks to show new subtasks (no full reload)
            if (sessionToken) {
              const tasksResponse = await authFetch(`/api/day-assistant-v2/dayplan?date=${selectedDate}`)
              if (tasksResponse.ok) {
                const data = await tasksResponse.json()
                setTasks(data.tasks || [])
              }
            }
          }}
          sessionToken={sessionToken}
        />
      )}

      {/* Break Timer Modal */}
      <BreakTimer
        isOpen={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onStartBreak={handleStartBreak}
      />

      {/* 🎮 GAMIFICATION: Quick Add Modal */}
      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSubmit={handleQuickAdd}
      />
      
      {/* Morning Review Modal */}
      <MorningReviewModal
        overdueTasks={overdueTasks}
        selectedDate={selectedDate}
        onAddToday={handleMorningAddToday}
        onMoveToTomorrow={handleMorningMoveToTomorrow}
        onReschedule={handleMorningReschedule}
        onDelete={handleMorningDelete}
      />
      </div>
    </>
  )
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (val: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-brand-purple"
      />
    </div>
  )
}

function TaskRow({
  task,
  queuePosition,
  onNotToday,
  onStart,
  onUnmark,
  onDecompose,
  onComplete,
  onPin,
  onDelete,
  onClick,
  focus,
  selectedDate,
  activeTimer,
  isCollapsed,
  onPauseTimer,
  onResumeTimer,
  onCompleteTimer,
  onSubtaskToggle
}: {
  task: TestDayTask
  queuePosition?: number
  onNotToday: () => void
  onStart: () => void
  onUnmark: () => void
  onDecompose: () => void
  onComplete: () => void
  onPin?: () => void
  onDelete?: () => void
  onClick?: () => void
  focus: number
  selectedDate: string
  activeTimer?: TimerState
  isCollapsed?: boolean
  onPauseTimer?: () => void
  onResumeTimer?: () => void
  onCompleteTimer?: () => void
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void
}) {
  const shouldSuggestTen = focus <= 2 && task.estimate_min > 20
  
  // Calculate score breakdown for tooltip
  const scoreBreakdown = queuePosition ? calculateScoreBreakdown(
    task,
    { energy: focus, focus, context: null },
    selectedDate
  ) : null
  
  // Visual distinction based on queue position
  const cardSizeClass = queuePosition === 1 
    ? 'p-4 border-2' // Large for #1
    : queuePosition && queuePosition <= 3 
    ? 'p-3' // Medium for #2-3
    : isCollapsed 
    ? 'p-2 opacity-70' // Small/muted for collapsed
    : 'p-3'
    
  const borderColorClass = queuePosition === 1
    ? 'border-green-500'
    : queuePosition === 2
    ? 'border-blue-400'
    : queuePosition === 3
    ? 'border-purple-400'
    : task.is_must 
    ? 'border-brand-purple/60'
    : 'border-gray-200'

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'border rounded-lg flex flex-col gap-2 bg-white shadow-sm transition-all hover:shadow-lg hover:border-purple-300',
        cardSizeClass,
        borderColorClass,
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-3" onClick={onClick}>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {queuePosition && scoreBreakdown && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      'px-3 py-1 text-sm font-bold rounded-full',
                      queuePosition === 1 && 'bg-green-500 text-white',
                      queuePosition === 2 && 'bg-blue-400 text-white',
                      queuePosition === 3 && 'bg-purple-400 text-white',
                      queuePosition > 3 && 'bg-gray-300 text-gray-700'
                    )}>
                      #{queuePosition}
                    </span>
                    <Info size={14} className="text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                    <div className="space-y-2">
                      <p className="font-semibold">💡 Dlaczego #{queuePosition} w kolejce?</p>
                      <p className="text-sm">Score: {scoreBreakdown.total}/100</p>
                      
                      <div className="space-y-1 text-xs">
                        {scoreBreakdown.factors.map((factor, idx) => (
                          <div key={idx} className="flex justify-between gap-2">
                            <span>
                              {factor.positive ? '✅' : '⚠️'} {factor.name}:
                            </span>
                            <span className={factor.positive ? 'text-green-400' : 'text-orange-400'}>
                              {factor.points > 0 ? '+' : ''}{factor.points}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {scoreBreakdown.explanation && (
                        <p className="text-xs text-gray-300 mt-2">
                          {scoreBreakdown.explanation}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
            )}
            {queuePosition && !scoreBreakdown && (
              <span className={cn(
                'px-3 py-1 text-sm font-bold rounded-full',
                queuePosition === 1 && 'bg-green-500 text-white',
                queuePosition === 2 && 'bg-blue-400 text-white',
                queuePosition === 3 && 'bg-purple-400 text-white',
                queuePosition > 3 && 'bg-gray-300 text-gray-700'
              )}>
                #{queuePosition}
              </span>
            )}
            {task.is_must && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">MUST</span>}
            <TaskBadges task={task} today={selectedDate} />
            {task.context_type && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {task.context_type}
              </span>
            )}
            <p className={cn(
              'font-semibold',
              queuePosition === 1 && 'text-lg',
              isCollapsed && 'text-sm'
            )}>{task.title}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Estymat: {getFormattedEstimate(task)} • Load {task.cognitive_load} • Przeniesienia: {task.postpone_count || 0}
          </p>
          
          {/* Show subtasks if any */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm font-semibold mb-2">📋 Kroki:</p>
              {task.subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-center gap-2 text-sm mb-1">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={(e) => {
                      e.stopPropagation()
                      if (onSubtaskToggle) {
                        onSubtaskToggle(subtask.id, !subtask.completed)
                      }
                    }}
                    className="w-4 h-4 text-brand-purple border-gray-300 rounded focus:ring-brand-purple cursor-pointer"
                  />
                  <span className={subtask.completed ? 'line-through text-gray-400' : ''}>
                    {subtask.content} ({subtask.estimated_duration} min)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {!isCollapsed && (
            <Button size="sm" variant="outline" onClick={onStart} className="hover:bg-green-50 transition-colors">
              <Play size={16} className="mr-1 text-green-600" weight="fill" /> Start
            </Button>
          )}
          <TaskContextMenu
            task={task}
            onComplete={onComplete}
            onNotToday={onNotToday}
            onPin={onPin}
            onDecompose={onDecompose}
            onDelete={onDelete}
            onEdit={onClick}
          />
        </div>
      </div>
      
      {/* Timer Display */}
      {activeTimer && (
        <TaskTimer
          timer={activeTimer}
          formatTime={(seconds) => {
            const mins = Math.floor(seconds / 60)
            const secs = seconds % 60
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          }}
          progressPercentage={Math.min(
            100,
            (activeTimer.elapsedSeconds / (activeTimer.estimatedMinutes * 60)) * 100
          )}
          onPause={onPauseTimer || (() => {})}
          onResume={onResumeTimer || (() => {})}
          onComplete={onCompleteTimer || (() => {})}
        />
      )}
      

    </motion.div>
  )
}

function ContextPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-sm border',
        active ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/40' : 'bg-white hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  )
}

// Wrapper component that provides QueryClient
export function DayAssistantV2View() {
  return (
    <QueryClientProvider client={queryClient}>
      <DayAssistantV2Content />
    </QueryClientProvider>
  )
}
