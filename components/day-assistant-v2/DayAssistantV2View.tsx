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
import { Play, XCircle, MagicWand, Gear, Info, Coffee, CaretDown, CaretUp, Plus } from '@phosphor-icons/react'
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
import { DayAssistantV2TaskCard } from './DayAssistantV2TaskCard'

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
import { QuickAddModal } from './QuickAddModal'
import { NewTaskModal, NewTaskData } from './NewTaskModal'
import { CreateTaskModal } from '@/components/assistant/CreateTaskModal'
import { updateStreakOnCompletion, updateDailyStats, triggerConfetti, triggerMilestoneToast, recalculateDailyTotal } from '@/lib/gamification'
import { useOverdueTasks } from '@/hooks/useOverdueTasks'
import { RiskBadge } from './RiskBadge'
import { BurnoutWarningModal } from './BurnoutWarningModal'
import { SmartAlertDialog } from './SmartAlertDialog'
import { assessTasksRisk, RiskAssessment } from '@/lib/riskPrediction'
import { assessBurnoutRisk, BurnoutAssessment } from '@/lib/burnoutPrevention'
import { calculateQueueWithOverflow, generateOverflowAlert, OverflowAlert } from '@/lib/capacityManager'
import { generatePassiveInsights, PassiveInsight } from '@/lib/services/passiveInsightEngine'
import { saveInsightFeedback } from '@/lib/services/insightFeedbackService'
import { Sparkle } from '@phosphor-icons/react'
import { TopStatusBar } from './TopStatusBar'
import { RecommendationPanel } from './RecommendationPanel'
import { DayAssistantV2FocusBar } from './DayAssistantV2FocusBar'
import { DayAssistantV2TopBar } from './DayAssistantV2TopBar'

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
const DEFAULT_COGNITIVE_LOAD_NEW_TASK = 2
const DEFAULT_CONTEXT_TYPE: TaskContext = 'deep_work'
const SCORING_DIFFERENCE_THRESHOLD = 0.1
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
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [clarifyTask, setClarifyTask] = useState<TestDayTask | null>(null)
  const [showLaterQueue, setShowLaterQueue] = useState(false)
  const [showRestOfQueue, setShowRestOfQueue] = useState(false)
  const [isReorderingQueue, setIsReorderingQueue] = useState(false)
  const [showRestOfToday, setShowRestOfToday] = useState(false)
  
  // NEW: Work mode state (replaces energy/focus sliders)
  const [workMode, setWorkMode] = useState<WorkMode>('standard')
  
  // NEW: Help me modal state
  const [helpMeTask, setHelpMeTask] = useState<TestDayTask | null>(null)
  
  // NEW: Create task modal state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  
  // NEW: Add time block modal state
  const [showAddTimeBlockModal, setShowAddTimeBlockModal] = useState(false)
  const [manualTimeBlock, setManualTimeBlock] = useState<number>(0) // Additional minutes added by user
  
  // NEW: Break timer state
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [breakActive, setBreakActive] = useState(false)
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0)
  
  // NEW: Quick add modal state
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  
  // NEW: Work hours state (for inline editing)
  const [workHoursStart, setWorkHoursStart] = useState<string>('09:00')
  const [workHoursEnd, setWorkHoursEnd] = useState<string>('17:00')
  const [capacityMinutes, setCapacityMinutes] = useState<number>(480)
  
  // NEW: AI Features state
  const [burnoutAssessment, setBurnoutAssessment] = useState<BurnoutAssessment | null>(null)
  const [showBurnoutModal, setShowBurnoutModal] = useState(false)
  const [taskRisks, setTaskRisks] = useState<Map<string, RiskAssessment>>(new Map())
  const [overflowAlert, setOverflowAlert] = useState<OverflowAlert | null>(null)
  const [showOverflowAlert, setShowOverflowAlert] = useState(false)
  
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
  
  // NEW: Passive Insights State
  const [insights, setInsights] = useState<PassiveInsight[]>([])
  const [dismissedInsightIds, setDismissedInsightIds] = useState<Set<string>>(new Set())
  
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
        const { response, data } = await syncTodoist(sessionToken)
        if (response.ok) {
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
        
        // 📊 Debug logging for cognitive_load and estimate_min
        console.log('📊 [Tasks Loaded] Cognitive load and estimate verification:')
        data.tasks.slice(0, 10).forEach((t: TestDayTask, idx: number) => {
          console.log(`  #${idx + 1}. "${t.title.substring(0, 40)}"`)
          console.log(`      cognitive_load: ${t.cognitive_load} (type: ${typeof t.cognitive_load})`)
          console.log(`      estimate_min: ${t.estimate_min} (type: ${typeof t.estimate_min})`)
          console.log(`      score: ${(t as any).metadata?._score || (t as any)._score || 'N/A'}`)
        })
      }
      
      setAssistant(data.assistant)
      setDayPlan(data.dayPlan)
      setTasks(data.tasks || [])
      setProposals(data.proposals || [])
      
      // Load work hours from dayPlan metadata
      if (data.dayPlan?.metadata) {
        if (data.dayPlan.metadata.work_hours_start) {
          setWorkHoursStart(data.dayPlan.metadata.work_hours_start)
        }
        if (data.dayPlan.metadata.work_hours_end) {
          setWorkHoursEnd(data.dayPlan.metadata.work_hours_end)
        }
        if (data.dayPlan.metadata.capacity_minutes) {
          setCapacityMinutes(data.dayPlan.metadata.capacity_minutes)
        }
      }
      
      // 🔍 Debug: Verify cognitive_load immediately after setting state
      console.log('🔍 [State Set] Cognitive load verification (first 5 tasks):')
      if (data.tasks && data.tasks.length > 0) {
        data.tasks.slice(0, 5).forEach((t: TestDayTask, idx: number) => {
          console.log(`  #${idx + 1}. "${t.title.substring(0, 40)}"`)
          console.log(`      cognitive_load: ${t.cognitive_load}`)
          console.log(`      estimate_min: ${t.estimate_min}`)
        })
      }
      
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

  // Load burnout assessment when component mounts
  useEffect(() => {
    if (sessionToken) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          assessBurnoutRisk(data.user.id)
            .then(assessment => {
              setBurnoutAssessment(assessment)
              if (assessment.riskLevel === 'high') {
                setShowBurnoutModal(true)
              }
            })
            .catch(err => console.error('Failed to assess burnout risk:', err))
        }
      })
    }
  }, [sessionToken])
  
  // Debug: Log cognitive_load values after tasks are loaded
  useEffect(() => {
    if (tasks.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('🔍 [DayAssistantV2View] Tasks after loading:')
      tasks.slice(0, 3).forEach((t) => {
        console.log(`  - "${t.title.substring(0, 40)}"`)
        console.log(`    cognitive_load: ${t.cognitive_load}`)
        console.log(`    estimate_min: ${t.estimate_min}`)
      })
    }
  }, [tasks])
  
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
    } else if (workMode === 'hyperfocus') {
      filtered = filtered.filter(t => t.cognitive_load >= 4)
    } else if (workMode === 'quick_wins') {
      filtered = filtered.filter(t => t.estimate_min < 20)
    }
    
    // 🔍 Debug: Verify cognitive_load after filtering
    if (filtered.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('🔍 [Filtered Tasks] Cognitive load after filtering (first 3):')
      filtered.slice(0, 3).forEach((t, idx) => {
        console.log(`  #${idx + 1}. "${t.title.substring(0, 40)}"`)
        console.log(`      cognitive_load: ${t.cognitive_load}`)
      })
    }
    
    return filtered
  }, [tasks, contextFilter, workMode])

  // Apply intelligent scoring to filtered tasks with V3 algorithm
  const scoredTasks = useScoredTasks(
    filteredTasks, 
    dayPlan, 
    selectedDate,
    contextFilter === 'all' ? null : contextFilter
  )

  // Use overdue tasks hook for better management
  const { overdueTasks } = useOverdueTasks(scoredTasks, selectedDate)

  // Non-overdue tasks for queue
  const nonOverdueTasks = useMemo(() => {
    return scoredTasks.filter(t => !t.due_date || t.due_date >= selectedDate)
  }, [scoredTasks, selectedDate])

  // MUST tasks - from ALL non-overdue tasks (max 3)
  const mustTasks = useMemo(() => {
    return nonOverdueTasks.filter(t => t.is_must).slice(0, 3)
  }, [nonOverdueTasks])

  // Use queue hook to calculate queue (with manual time block)
  const { queue, remainingToday, later, availableMinutes, usedMinutes, usagePercentage, overflowCount } = useTaskQueue(
    nonOverdueTasks,
    dayPlan,
    manualTimeBlock
  )

  // Top 3 tasks - najlepiej scored na dzisiaj (nie-MUST) that fit in capacity
  const top3Tasks = useMemo(() => {
    return queue.filter(t => !t.is_must).slice(0, 3)
  }, [queue])

  // Update task risks when tasks or queue changes
  useEffect(() => {
    if (tasks.length > 0 && queue.length > 0) {
      const risks = assessTasksRisk(tasks, queue, dayPlan)
      setTaskRisks(risks)
    }
  }, [tasks, queue, dayPlan])
  
  // Generate passive insights when queue changes (NEW!)
  useEffect(() => {
    const todayOverflowTasks = later.filter(task => task.due_date === selectedDate)
    const insightQueue = [...queue, ...remainingToday, ...todayOverflowTasks]
    const plannedMinutes = insightQueue.reduce((sum, task) => sum + (task.estimate_min || 0), 0)

    console.log('🔍 [Insights Debug] ========== START ==========')
    console.log('🔍 [Insights Debug] Checking conditions:', {
      queueLength: insightQueue.length,
      dayPlanExists: !!dayPlan,
      tasksCount: tasks.length,
      availableMinutes,
      plannedMinutes,
      dismissedCount: dismissedInsightIds.size
    })
    
    if (insightQueue.length === 0) {
      console.log('⚠️ [Insights Debug] Skipping - queue is empty')
      return
    }
    
    if (!dayPlan) {
      console.log('⚠️ [Insights Debug] Skipping - no dayPlan')
      return
    }
    
    console.log('✅ [Insights Debug] Conditions met - generating insights...')
    
    // Log queue composition
    console.log('📊 [Insights Debug] Queue composition:')
    insightQueue.forEach((task, idx) => {
      console.log(`  #${idx + 1}:`, {
        id: task.id,
        title: task.title,
        context_type: task.context_type,
        cognitive_load: task.cognitive_load,
        estimate_min: task.estimate_min,
        score: (task as any).metadata?._score || (task as any)._score,
        hasReasoning: !!((task as any).metadata?._scoreReasoning || (task as any)._scoreReasoning)
      })
    })
    
    // Generate insights
    try {
      const newInsights = generatePassiveInsights(insightQueue, tasks, {
        energy: dayPlan.energy,
        capacity: availableMinutes,
        usedTime: plannedMinutes
      })
      
      console.log('💡 [Insights Debug] Generated insights:')
      newInsights.forEach((insight, idx) => {
        console.log(`  ${idx + 1}. [${insight.type}] ${insight.title}`)
        console.log(`     Priority: ${insight.priority}`)
        console.log(`     Message: ${insight.message}`)
        console.log(`     Highlighted tasks: ${insight.highlightTaskIds?.length || 0}`)
      })
      
      console.log('💡 [Insights Debug] Total generated:', newInsights.length)
      
      // Filter dismissed
      const filteredInsights = newInsights.filter(i => !dismissedInsightIds.has(i.id))
      console.log('✅ [Insights Debug] After filtering dismissed:', filteredInsights.length)
      
      if (filteredInsights.length < newInsights.length) {
        console.log('🚫 [Insights Debug] Filtered out:', 
          newInsights.filter(i => dismissedInsightIds.has(i.id)).map(i => i.type)
        )
      }
      
      setInsights(filteredInsights)
      console.log('✅ [Insights Debug] State updated with', filteredInsights.length, 'insights')
    } catch (error) {
      console.error('❌ [Insights Debug] Error generating insights:', error)
    }
    
    console.log('🔍 [Insights Debug] ========== END ==========')
  }, [queue, remainingToday, later, selectedDate, tasks, dayPlan, availableMinutes, dismissedInsightIds])

  // 🔍 DEBUG LOGGING for queue state
  useEffect(() => {
    console.log('📊 [Queue Debug]', {
      totalTasks: tasks.length,
      filteredTasks: filteredTasks.length,
      scoredTasks: scoredTasks.length,
      overdueTasks: overdueTasks.length,
      mustTasks: mustTasks.length,
      top3Tasks: top3Tasks.length,
      nonOverdueTasks: nonOverdueTasks.length,
      queueTasks: queue.length,
      remainingTodayTasks: remainingToday.length,
      laterTasks: later.length,
      overflowCount,
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
    
    if (top3Tasks.length > 0) {
      console.log('🎯 [Top 3 Tasks]', top3Tasks.map(t => ({
        title: t.title,
        due_date: t.due_date,
        score: (t as any)._score || 'N/A'
      })))
    }
    
    if (remainingToday.length > 0) {
      console.log('✅ [Remaining Today Tasks]', remainingToday.map(t => ({
        title: t.title,
        estimate: t.estimate_min,
        score: (t as any)._score || 'N/A'
      })))
    }
    
    if (later.length > 0) {
      console.log('📋 [Later Tasks]', later.map(t => ({
        title: t.title,
        estimate: t.estimate_min,
        due_date: t.due_date || 'no date',
        score: (t as any)._score || 'N/A'
      })))
    }
  }, [tasks.length, filteredTasks.length, scoredTasks.length, overdueTasks, mustTasks.length, top3Tasks, nonOverdueTasks.length, queue.length, remainingToday, later, overflowCount, availableMinutes, usedMinutes])

  // matchedTasks kept for backward compatibility with existing queue logic
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

  // Calculate today's task stats for TopStatusBar
  const completedToday = useMemo(() => {
    return tasks.filter(t => t.completed && t.due_date === selectedDate).length
  }, [tasks, selectedDate])

  const totalToday = useMemo(() => {
    return tasks.filter(t => t.due_date === selectedDate).length
  }, [tasks, selectedDate])

  // Get first task in queue for TopStatusBar
  const firstInQueue = useMemo(() => {
    if (mustTasks.length > 0) {
      return { title: mustTasks[0].title }
    }
    if (queue.length > 0) {
      return { title: queue[0].title }
    }
    return undefined
  }, [mustTasks, queue])

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

  // Handler for NewTaskModal submission
  const handleNewTaskSubmit = async (taskData: NewTaskData) => {
    const response = await authFetch('/api/day-assistant-v2/task', {
      method: 'POST',
      body: JSON.stringify({
        title: taskData.title,
        description: taskData.description,
        estimate_min: taskData.estimateMin,
        cognitive_load: taskData.cognitiveLoad,
        is_must: taskData.isMust,
        is_important: taskData.isImportant,
        due_date: taskData.dueDate,
        context_type: taskData.contextType,
        priority: taskData.priority,
        tags: taskData.tags
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

  const handleStartTimer = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      handleStartTask(task)
    }
  }

  // Wrapper handlers for DayAssistantV2TaskCard (take taskId strings)
  const handleCompleteById = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) await handleComplete(task)
  }

  const handlePinById = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) await handlePin(task)
  }

  const handlePostponeById = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) await handleNotToday(task)
  }

  const handleDeleteById = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) await handleDelete(task)
  }

  const handleHelpById = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) setHelpMeTask(task)
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

  // NEW: Work hours handlers
  const revertWorkHours = () => {
    const prevStart = dayPlan?.metadata?.work_hours_start || '09:00'
    const prevEnd = dayPlan?.metadata?.work_hours_end || '17:00'
    const prevCapacity = dayPlan?.metadata?.capacity_minutes || 480
    setWorkHoursStart(prevStart)
    setWorkHoursEnd(prevEnd)
    setCapacityMinutes(prevCapacity)
  }

  const handleWorkHoursChange = async (start: string, end: string) => {
    // Calculate new capacity
    const startTime = new Date(`2000-01-01T${start}`)
    const endTime = new Date(`2000-01-01T${end}`)
    const timeDiff = endTime.getTime() - startTime.getTime()
    
    // Handle invalid time ranges
    if (timeDiff <= 0) {
      console.warn('[DayAssistantV2] Invalid work hours: end time must be after start time')
      showToast('Godzina zakończenia musi być po godzinie rozpoczęcia', 'error')
      return
    }
    
    const newCapacity = Math.floor(timeDiff / 1000 / 60)
    
    // Update local state
    setWorkHoursStart(start)
    setWorkHoursEnd(end)
    setCapacityMinutes(newCapacity)
    
    // Save to database
    try {
      const response = await authFetch('/api/day-assistant-v2/dayplan', {
        method: 'PUT',
        body: JSON.stringify({
          date: selectedDate,
          metadata: {
            work_hours_start: start,
            work_hours_end: end,
            capacity_minutes: newCapacity
          }
        })
      })
      
      if (response.ok) {
        console.log('[DayAssistantV2] Work hours saved successfully')
        addDecisionLog(`Zaktualizowano godziny pracy: ${start} - ${end}`)
      } else {
        revertWorkHours()
        showToast('Nie udało się zapisać godzin pracy', 'error')
      }
    } catch (error) {
      console.error('[DayAssistantV2] Failed to save work hours:', error)
      revertWorkHours()
      showToast('Nie udało się zapisać godzin pracy', 'error')
    }
  }

  const handleWorkModeChange = (mode: WorkMode) => {
    setWorkMode(mode)
    setIsReorderingQueue(true)
    setTimeout(() => setIsReorderingQueue(false), 300)
    addDecisionLog(`Zmieniono tryb pracy na ${mode}`)
  }

  const handleCompleteOverdue = async (task: TestDayTask) => {
    // Stop timer if this task is active
    if (activeTimer && activeTimer.taskId === task.id) {
      stopTimer()
    }

    // Optimistic update - remove from list
    setTasks(prev => prev.filter(t => t.id !== task.id))
    addDecisionLog(`Ukończono przeterminowane zadanie "${task.title}"`)
    
    try {
      // Get Todoist token
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No user session')
      }
      
      const { getTodoistToken } = await import('@/lib/integrations')
      const todoistToken = await getTodoistToken(user.id)
      
      // 1. Close task in Todoist
      if (task.todoist_task_id && todoistToken) {
        const todoistResponse = await fetch(`https://api.todoist.com/rest/v2/tasks/${task.todoist_task_id}/close`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${todoistToken}`
          }
        })
        
        if (!todoistResponse.ok) {
          console.error('Failed to close Todoist task:', await todoistResponse.text())
        }
      }
      
      // 2. Update local DB
      await completeTaskMutation.mutateAsync(task.id)
      
      // 🎮 GAMIFICATION: Update streak and stats
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
      
      toast.success('✅ Zadanie ukończone!')
    } catch (error) {
      console.error('Complete overdue task error:', error)
      // Rollback on error - add task back
      setTasks(prev => [...prev, task])
      toast.error('❌ Nie udało się ukończyć zadania')
    }
  }

  const handleKeepOverdueToday = async (task: TestDayTask) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, due_date: selectedDate } : t
    ))
    
    addDecisionLog(`Przeniesiono przeterminowane zadanie "${task.title}" na dziś`)
    toast.success('✅ Przeniesiono na dziś')
    
    try {
      // Get Todoist token
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No user session')
      }
      
      const { getTodoistToken } = await import('@/lib/integrations')
      const todoistToken = await getTodoistToken(user.id)
      
      // 1. Update Todoist if token available
      if (task.todoist_task_id && todoistToken) {
        const todoistResponse = await fetch(`https://api.todoist.com/rest/v2/tasks/${task.todoist_task_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${todoistToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            due_date: selectedDate
          })
        })
        
        if (!todoistResponse.ok) {
          console.error('Failed to update Todoist task:', await todoistResponse.text())
        }
      }
      
      // 2. Update local DB
      const { error } = await supabase
        .from('day_assistant_v2_tasks')
        .update({ due_date: selectedDate })
        .eq('id', task.id)
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error updating overdue task:', error)
      // Rollback on error
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, due_date: task.due_date } : t
      ))
      toast.error('❌ Nie udało się przenieść zadania')
    }
  }

  const handlePostponeOverdue = async (task: TestDayTask) => {
    const tomorrow = new Date(selectedDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString().split('T')[0]
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, due_date: tomorrowISO } : t
    ))
    
    addDecisionLog(`Przełożono przeterminowane zadanie "${task.title}" na jutro`)
    toast.success('✅ Przełożono na jutro')
    
    try {
      // Get Todoist token
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No user session')
      }
      
      const { getTodoistToken } = await import('@/lib/integrations')
      const todoistToken = await getTodoistToken(user.id)
      
      // 1. Update Todoist if token available
      if (task.todoist_task_id && todoistToken) {
        const todoistResponse = await fetch(`https://api.todoist.com/rest/v2/tasks/${task.todoist_task_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${todoistToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            due_date: tomorrowISO
          })
        })
        
        if (!todoistResponse.ok) {
          console.error('Failed to update Todoist task:', await todoistResponse.text())
        }
      }
      
      // 2. Update local DB
      const { error } = await supabase
        .from('day_assistant_v2_tasks')
        .update({ due_date: tomorrowISO })
        .eq('id', task.id)
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error postponing overdue task:', error)
      // Rollback on error
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, due_date: task.due_date } : t
      ))
      toast.error('❌ Nie udało się przełożyć zadania')
    }
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

  const handleMorningReschedule = async (task: TestDayTask, date?: string) => {
    if (date) {
      // Reschedule to specific date
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, due_date: date } : t
      ))
      
      addDecisionLog(`Przełożono "${task.title}" na ${date}`)
      toast.success(`📅 Zadanie przełożone na ${date}`)
      
      try {
        const response = await authFetch('/api/day-assistant-v2/task', {
          method: 'PUT',
          body: JSON.stringify({ 
            task_id: task.id, 
            due_date: date 
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
        toast.error('Błąd przy aktualizacji zadania')
      }
    } else {
      // Default behavior - postpone to tomorrow
      await handleNotToday(task, 'Przełożono z porannego przeglądu')
      toast.success('📅 Zadanie przełożone')
    }
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
  
  // NEW: Handle passive insight feedback
  const handleInsightFeedback = async (
    insight: PassiveInsight,
    feedback: 'helpful' | 'not_helpful' | 'neutral'
  ) => {
    if (!sessionToken) return
    
    // Get user ID from session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    // Save feedback to database
    const result = await saveInsightFeedback(session.user.id, insight, feedback)
    
    if (result.success) {
      // Dismiss the insight
      setDismissedInsightIds(prev => new Set(prev).add(insight.id))
      setInsights(prev => prev.filter(i => i.id !== insight.id))
      
      // Show appropriate toast
      if (feedback === 'helpful') {
        toast.success('Dzięki za feedback!')
      } else if (feedback === 'not_helpful') {
        toast.info('OK, nie pokażę już dzisiaj')
      }
      
      console.log('✅ [Insight Feedback] Saved:', { type: insight.type, feedback })
    } else {
      console.error('❌ [Insight Feedback] Failed to save:', result.error)
    }
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
      
      {/* ADHD Focus Bar - Only when timer is active */}
      {activeTimer && (
        <DayAssistantV2FocusBar
          task={tasks.find(t => t.id === activeTimer.taskId) || null}
          elapsedSeconds={activeTimer.elapsedSeconds}
          isPaused={activeTimer.isPaused}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onComplete={handleTimerComplete}
          onStop={handleTimerStop}
        />
      )}
      
      {/* New Top Bar - Always visible */}
      <DayAssistantV2TopBar
        selectedDate={selectedDate}
        workHoursStart={workHoursStart}
        workHoursEnd={workHoursEnd}
        capacityMinutes={capacityMinutes}
        workMode={workMode}
        completedMinutes={usedMinutes}
        onWorkHoursChange={handleWorkHoursChange}
        onWorkModeChange={handleWorkModeChange}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(600px,2fr)_minmax(400px,1fr)] gap-6">
        {/* Main content area with improved spacing */}
        <div className="space-y-6 min-w-0">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl text-brand-purple">Asystent Dnia v2</CardTitle>
              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Konfiguracja dnia pracy"
              >
                <Gear size={24} className="text-gray-600" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {/* Work Mode Selector */}
            <WorkModeSelector
              value={workMode}
              onChange={handleWorkModeChange}
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
          onComplete={handleCompleteOverdue}
          onKeepToday={handleKeepOverdueToday}
          onPostpone={handlePostponeOverdue}
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
                <DayAssistantV2TaskCard
                  key={task.id}
                  task={task}
                  queuePosition={index + 1}
                  onStartTimer={handleStartTimer}
                  onComplete={handleCompleteById}
                  onHelp={handleHelpById}
                  onPin={handlePinById}
                  onPostpone={handlePostponeById}
                  onDelete={handleDeleteById}
                  onOpenDetails={(id) => {
                    const task = mustTasks.find(t => t.id === id)
                    if (task) setSelectedTask(task)
                  }}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* 🎯 Top 3 - ZAWSZE WIDOCZNA */}
        <Card className="shadow-md border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50">
          {isReorderingQueue && <QueueReorderingOverlay />}
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">🎯</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Top 3
              </span>
              <Badge className="bg-blue-600 text-white font-semibold px-3 py-1">
                {top3Tasks.length} zadań
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-700 mt-1 font-medium">
              Top scored na dziś • {usedMinutes} / {availableMinutes} min ({usagePercentage}%)
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {top3Tasks.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600 font-medium">
                  🎉 Brak zadań w kolejce
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Dodaj zadania lub przypnij je jako MUST
                </p>
              </div>
            ) : (
              top3Tasks.map((task, index) => (
                <DayAssistantV2TaskCard
                  key={task.id}
                  task={task}
                  queuePosition={mustTasks.length + index + 1}
                  onStartTimer={handleStartTimer}
                  onComplete={handleCompleteById}
                  onHelp={handleHelpById}
                  onPin={handlePinById}
                  onPostpone={handlePostponeById}
                  onDelete={handleDeleteById}
                  onOpenDetails={(id) => {
                    const task = top3Tasks.find(t => t.id === id)
                    if (task) setSelectedTask(task)
                  }}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* 📋 Pozostałe na dziś (collapsible) - Tasks that FIT in capacity */}
        {remainingToday.length > 0 && (
          <Card className="border-green-400 bg-gradient-to-br from-green-50 to-blue-50 shadow-sm">
            {isReorderingQueue && <QueueReorderingOverlay />}
            <CardHeader 
              className="cursor-pointer hover:bg-green-100/50 transition-colors rounded-t-lg"
              onClick={() => setShowRestOfToday(!showRestOfToday)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  <span className="text-gray-800">Pozostałe na dziś</span>
                  <Badge className="bg-green-600 text-white font-semibold px-3 py-1">
                    {remainingToday.length} zadań
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 font-semibold px-3 py-1 border border-green-300">
                    Mieszczą się w capacity
                  </Badge>
                </CardTitle>
                <CaretDown className={cn(
                  "transition-transform text-gray-600",
                  showRestOfToday && "rotate-180"
                )} size={24} />
              </div>
              <p className="text-xs text-gray-700 mt-1 font-medium">
                Reszta zadań na dzisiaj które mieszczą się w {availableMinutes} min capacity
              </p>
            </CardHeader>
            {showRestOfToday && (
              <CardContent className="space-y-2 pt-4">
                {remainingToday.map((task, index) => (
                  <DayAssistantV2TaskCard
                    key={task.id}
                    task={task}
                    queuePosition={queue.length + index + 1}
                    onStartTimer={handleStartTimer}
                    onComplete={handleCompleteById}
                    onHelp={handleHelpById}
                    onPin={handlePinById}
                    onPostpone={handlePostponeById}
                    onDelete={handleDeleteById}
                    onOpenDetails={(id) => {
                      const task = remainingToday.find(t => t.id === id)
                      if (task) setSelectedTask(task)
                    }}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Empty state - ONLY if truly no tasks */}
        {mustTasks.length === 0 && 
         top3Tasks.length === 0 && 
         remainingToday.length === 0 && 
         later.length === 0 && 
         overdueTasks.length === 0 && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-6 text-center">
              <p className="text-green-800 font-semibold">
                🎉 Brak zadań - masz wolne!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Low Focus fallback - when there are tasks but none match the work mode */}
        {mustTasks.length === 0 && 
         top3Tasks.length === 0 && 
         remainingToday.length === 0 && 
         later.length === 0 &&
         overdueTasks.length === 0 &&
         tasks.length > 0 && (
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
                  <DayAssistantV2TaskCard
                    key={easiestTask.id}
                    task={easiestTask}
                    onStartTimer={handleStartTimer}
                    onComplete={handleCompleteById}
                    onHelp={handleHelpById}
                    onPin={handlePinById}
                    onPostpone={handlePostponeById}
                    onDelete={handleDeleteById}
                    onOpenDetails={(id) => setSelectedTask(easiestTask)}
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
            </CardContent>
          </Card>
        )}

        {/* 📅 Na później (collapsible) - Overflow + Future */}
        <Card className="border-orange-400 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-sm">
          <CardHeader 
            className="cursor-pointer hover:bg-orange-100/50 transition-colors rounded-t-lg"
            onClick={() => setShowLaterQueue(!showLaterQueue)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <span className="text-gray-800">Na później</span>
                <Badge className="bg-orange-600 text-white font-semibold px-3 py-1">
                  {later.length} zadań
                </Badge>
                {overflowCount > 0 && (
                  <Badge className="bg-red-100 text-red-700 font-semibold px-3 py-1 border border-red-300">
                    ⚠️ {overflowCount} z dzisiaj (nie mieszczą się)
                  </Badge>
                )}
              </CardTitle>
              <CaretDown className={cn(
                "transition-transform text-gray-600",
                showLaterQueue && "rotate-180"
              )} size={24} />
            </div>
            <p className="text-xs text-gray-700 mt-1 font-medium">
              Zadania z dzisiaj które nie mieszczą się w capacity + przyszłe daty + bez daty
            </p>
          </CardHeader>
          {showLaterQueue && (
            <CardContent className="space-y-3 pt-4">
              {later.length === 0 ? (
                <div className="p-4 text-center bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm text-gray-700 font-medium">
                    ✅ Wszystkie zadania mieszczą się w dostępnym czasie pracy
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 font-medium bg-white p-2 rounded border border-orange-200">
                    💡 Opcjonalne zadania - możesz je zrobić jeśli skończysz wcześniej
                  </p>
                  
                  <div className="border-t pt-3 mt-2 border-orange-200 space-y-2">
                    {later.map((task, index) => {
                      const isOverflowToday = task.due_date === selectedDate
                      return (
                        <div key={task.id} className="space-y-1">
                          {isOverflowToday && (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 border border-red-300">
                                ⚠️ Dzisiaj (overflow)
                              </Badge>
                              <span className="text-xs text-gray-600">
                                To zadanie jest na dziś, ale nie mieści się w capacity
                              </span>
                            </div>
                          )}
                          <DayAssistantV2TaskCard
                            key={task.id}
                            task={task}
                            queuePosition={queue.length + remainingToday.length + index + 1}
                            onStartTimer={handleStartTimer}
                            onComplete={handleCompleteById}
                            onHelp={handleHelpById}
                            onPin={handlePinById}
                            onPostpone={handlePostponeById}
                            onDelete={handleDeleteById}
                            onOpenDetails={(id) => {
                              const foundTask = later.find(t => t.id === id)
                              if (foundTask) setSelectedTask(foundTask)
                            }}
                          />
                        </div>
                      )
                    })}
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
          <CardContent>
            <Button 
              onClick={() => setShowCreateTaskModal(true)}
              className="w-full gap-2"
            >
              <Plus size={20} />
              Dodaj zadanie na dziś
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 min-w-0 flex-shrink-0">
        {/* AI Insights Panel */}
        <Card className="border-purple-200 bg-purple-50 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkle className="text-purple-600" size={20} />
              <CardTitle className="text-base">
                💡 AI zauważyło wzorce
              </CardTitle>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Sugestie oparte na analizie kolejki (nie zmieniają kolejności)
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length === 0 ? (
              /* Fallback UI when no insights */
              <div className="p-6 text-center">
                <p className="text-gray-600 font-medium">
                  🔍 Analizuję Twoją kolejkę...
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Insighty pojawią się gdy AI wykryje wzorce w Twoich zadaniach
                </p>
                
                {/* Debug info in dev mode */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-left">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                      🔧 Debug info
                    </summary>
                    <pre className="text-xs bg-gray-800 text-gray-100 p-2 rounded mt-2 overflow-auto max-h-48">
{JSON.stringify({
  queueLength: queue.length,
  dayPlanExists: !!dayPlan,
  energy: dayPlan?.energy,
  dismissedCount: dismissedInsightIds.size,
  tasksWithContext: tasks.filter(t => t.context_type).length,
  queueSample: queue.slice(0, 3).map(t => ({
    id: t.id.substring(0, 8),
    title: t.title.substring(0, 30),
    context: t.context_type,
    estimate: t.estimate_min
  }))
}, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              /* Show insights */
              insights.map(insight => (
                <div
                  key={insight.id}
                  className="p-4 bg-white rounded-lg border border-purple-200 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{insight.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-900">{insight.title}</h4>
                      <p className="text-sm text-gray-700 mt-1">{insight.message}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInsightFeedback(insight, 'helpful')}
                      className="text-green-700 border-green-300 hover:bg-green-50"
                    >
                      👍 Przydatne
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInsightFeedback(insight, 'not_helpful')}
                      className="text-red-700 border-red-300 hover:bg-red-50"
                    >
                      👎 Nieprzydatne
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleInsightFeedback(insight, 'neutral')}
                    >
                      🤷 Nie wiem
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DecisionLog</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
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
      
      {/* Create Task Modal */}
      <CreateTaskModal
        open={showCreateTaskModal}
        onOpenChange={setShowCreateTaskModal}
        onCreateTask={async (taskData) => {
          try {
            // Create task via API
            const response = await authFetch('/api/day-assistant-v2/task', {
              method: 'POST',
              body: JSON.stringify({
                title: taskData.content,
                estimate_min: taskData.duration || 25,
                cognitive_load: 2, // default
                is_must: false,
                is_important: false,
                due_date: taskData.due || selectedDate,
                context_type: 'deep_work', // default
                priority: taskData.priority || 3,
                description: taskData.description || '',
                // If project_id is provided
                ...(taskData.project_id && { project_id: taskData.project_id }),
                // If labels are provided
                ...(taskData.labels && { labels: taskData.labels })
              })
            })
            
            if (!response.ok) {
              const err = await response.json().catch(() => ({}))
              showToast(err.message || 'Nie udało się dodać zadania', 'error')
              throw new Error(err.message)
            }
            
            const data = await response.json()
            
            // Add to local state
            setTasks(prev => [...prev, data.task])
            addDecisionLog(`Dodano zadanie "${data.task.title}"`)
            showToast('✅ Zadanie dodane!', 'success')
            
            // 🎮 GAMIFICATION: Recalculate daily stats
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await recalculateDailyTotal(user.id)
            }
          } catch (error) {
            console.error('Error creating task:', error)
            throw error
          }
        }}
      />
      
      {/* Morning Review Modal */}
      <MorningReviewModal
        overdueTasks={overdueTasks}
        selectedDate={selectedDate}
        onAddToday={handleMorningAddToday}
        onMoveToTomorrow={handleMorningMoveToTomorrow}
        onReschedule={handleMorningReschedule}
        onDelete={handleMorningDelete}
        onComplete={handleCompleteOverdue}
      />
      
      {/* Burnout Warning Modal - NEW! */}
      <BurnoutWarningModal
        burnout={burnoutAssessment}
        isOpen={showBurnoutModal}
        onClose={() => setShowBurnoutModal(false)}
        onAction={(action) => {
          console.log('Burnout action:', action)
          toast.info(`Akcja: ${action}`)
        }}
      />
      
      {/* Smart Overflow Alert - NEW! */}
      <SmartAlertDialog
        alert={overflowAlert}
        isOpen={showOverflowAlert}
        onClose={() => setShowOverflowAlert(false)}
        onActionClick={(action, data) => {
          console.log('Overflow action:', action, data)
          toast.info(`Akcja: ${action}`)
        }}
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

// NOTE: TaskRow component removed - replaced with DayAssistantV2TaskCard
// The old TaskRow component (440+ lines) has been replaced with the new
// DayAssistantV2TaskCard component which uses modern badge components
// and provides better visual hierarchy and user experience.
// See DayAssistantV2TaskCard.tsx, DayAssistantV2TaskBadges.tsx, and DayAssistantV2TaskTooltip.tsx

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
