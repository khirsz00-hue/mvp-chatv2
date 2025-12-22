'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { syncTodoist, startBackgroundSync } from '@/lib/todoistSync'
import {
  ENERGY_FOCUS_PRESETS,
  DayPlan,
  TestDayTask,
  Proposal,
  ContextType
} from '@/lib/types/dayAssistantV2'
import {
  checkLightTaskLimit,
  generateUnmarkMustWarning,
  calculateScoreBreakdown
} from '@/lib/services/dayAssistantV2RecommendationEngine'
import { CONTEXT_LABELS, CONTEXT_COLORS, TaskContext } from '@/lib/services/contextInferenceService'
import { Play, XCircle, Clock, ArrowsClockwise, MagicWand, Prohibit, PushPin, Gear, DotsThree, Check, Trash, Pencil, Info } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useScoredTasks } from '@/hooks/useScoredTasks'
import { useTaskQueue } from '@/hooks/useTaskQueue'
import { useTaskTimer, TimerState } from '@/hooks/useTaskTimer'
import { TaskBadges } from './TaskBadges'
import { TaskDetailsModal } from './TaskDetailsModal'
import { RecommendationPanel } from './RecommendationPanel'
import { EnergyFocusControls } from './EnergyFocusControls'
import { WorkHoursConfigModal } from './WorkHoursConfigModal'
import { TaskTimer } from './TaskTimer'
import { OverdueTasksSection } from './OverdueTasksSection'
import { ClarifyModal } from './ClarifyModal'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

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

export function DayAssistantV2View() {
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
  const undoTimer = useRef<NodeJS.Timeout | null>(null)

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

  // Background sync every 30 seconds with data refresh
  useEffect(() => {
    if (!sessionToken) return
    
    const doSyncAndRefresh = async () => {
      try {
        const response = await syncTodoist(sessionToken)
        if (response.ok) {
          const data = await response.json()
          // Only reload if sync was not skipped (skipped syncs don't need refresh)
          // Check for success_count > 0 (tasks were actually synced) or synced_at (sync completed)
          // Skip reload if data.skipped is true (debounced sync)
          const hasSyncedTasks = (typeof data.success_count === 'number' && data.success_count > 0) || data.synced_at
          if (!data.skipped && hasSyncedTasks) {
            console.log('[DayAssistantV2] Background sync completed with changes, reloading data')
            await loadDayPlan(sessionToken)
          } else if (data.skipped) {
            console.log('[DayAssistantV2] Sync skipped (debounced), no reload needed')
          } else {
            console.log('[DayAssistantV2] Sync completed but no changes detected')
          }
        }
      } catch (err) {
        console.error('[DayAssistantV2] Background sync failed:', err)
      }
    }
    
    // Sync every 30 seconds (reduced from 10s to avoid too frequent updates)
    const interval = setInterval(doSyncAndRefresh, 30000)
    
    return () => clearInterval(interval)
  }, [sessionToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic requeue on energy/focus change
  useEffect(() => {
    if (dayPlan && sessionToken) {
      console.log('[DayAssistantV2] Energy/Focus changed, triggering requeue')
      // The queue will automatically update via the useMemo dependencies
      addDecisionLog('Kolejka zaktualizowana po zmianie energii/skupienia')
    }
  }, [dayPlan?.energy, dayPlan?.focus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic requeue every 15 minutes (time advances)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[DayAssistantV2] Periodic requeue (15 min)')
      // Force a reload to recalculate available time
      if (sessionToken) {
        loadDayPlan(sessionToken)
      }
    }, 15 * 60 * 1000) // 15 minutes
    
    return () => clearInterval(interval)
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
    return tasks.filter(t => (!t.due_date || t.due_date === selectedDate) && (contextFilter === 'all' || t.context_type === contextFilter))
  }, [tasks, selectedDate, contextFilter])

  // Apply intelligent scoring to filtered tasks
  const scoredTasks = useScoredTasks(filteredTasks, dayPlan, selectedDate)

  // Separate overdue tasks
  const overdueTasks = useMemo(() => {
    return scoredTasks.filter(t => t.due_date && t.due_date < selectedDate && !t.completed)
  }, [scoredTasks, selectedDate])

  // Non-overdue tasks for queue
  const nonOverdueTasks = useMemo(() => {
    return scoredTasks.filter(t => !t.due_date || t.due_date >= selectedDate)
  }, [scoredTasks, selectedDate])

  // Use queue hook to calculate queue
  const { queue, later, availableMinutes, usedMinutes, usagePercentage } = useTaskQueue(
    nonOverdueTasks,
    dayPlan
  )

  const mustTasks = queue.filter(t => t.is_must).slice(0, 3)
  const matchedTasks = queue.filter(t => !t.is_must && !t.completed)
  const autoMoved = scoredTasks.filter(t => t.auto_moved)

  const lightUsage = useMemo(() => {
    if (!assistant) return null
    return checkLightTaskLimit(filteredTasks, assistant)
  }, [assistant, filteredTasks])

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
    setDayPlan(prev => prev ? { ...prev, [field]: value } : prev)
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
  }

  const handleNotToday = async (task: TestDayTask, reason = 'Nie dziś') => {
    const response = await authFetch('/api/day-assistant-v2/postpone', {
      method: 'POST',
      body: JSON.stringify({ task_id: task.id, reason, reserve_morning: true })
    })
    if (!response.ok) {
      showToast('Nie udało się przenieść zadania', 'error')
      return
    }
    const data = await response.json()
    setTasks(prev => prev.filter(t => t.id !== task.id))
    if (data.proposal) {
      setProposals(prev => [data.proposal, ...prev].slice(0, 3))
    }
    addDecisionLog(`Przeniesiono "${task.title}" na jutro`)
    if (data.undo_window_expires && data.decision_log_id) {
      setUndoToast({ decisionId: data.decision_log_id, expiresAt: data.undo_window_expires })
      if (undoTimer.current) clearTimeout(undoTimer.current)
      const ttl = Math.max(5000, new Date(data.undo_window_expires).getTime() - Date.now())
      undoTimer.current = setTimeout(() => setUndoToast(null), Math.min(ttl, 15000))
    }
  }

  const handleUndo = async () => {
    const response = await authFetch('/api/day-assistant-v2/undo', { method: 'POST' })
    if (response.ok) {
      await loadDayPlan()
      setUndoToast(null)
      addDecisionLog('Cofnięto ostatnią akcję')
    } else {
      showToast('Nie udało się cofnąć', 'error')
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
    const response = await authFetch('/api/day-assistant-v2/proposal', {
      method: 'POST',
      body: JSON.stringify({ 
        proposal_id: proposalId, 
        action, 
        alternative_index: alternativeIndex,
        reject_reason: rejectReason
      })
    })
    if (response.ok) {
      setProposals(prev => prev.filter(p => p.id !== proposalId))
      if (action === 'reject' && rejectReason) {
        addDecisionLog(`Odrzucono rekomendację: ${rejectReason}`)
      } else {
        addDecisionLog(`Obsłużono rekomendację (${action})`)
      }
      await loadDayPlan()
    } else {
      showToast('Nie udało się zaktualizować rekomendacji', 'error')
    }
  }

  const handleComplete = async (task: TestDayTask) => {
    // Stop timer if this task is active
    if (activeTimer && activeTimer.taskId === task.id) {
      stopTimer()
    }

    const response = await authFetch('/api/day-assistant-v2/complete', {
      method: 'POST',
      body: JSON.stringify({ task_id: task.id })
    })
    if (response.ok) {
      setTasks(prev => prev.filter(t => t.id !== task.id))
      addDecisionLog(`Oznaczono "${task.title}" jako wykonane`)
      showToast('✅ Zadanie ukończone', 'success')
      
      // TODO: Add celebration animation
      // showCelebration()
    } else {
      showToast('Nie udało się oznaczyć jako wykonane', 'error')
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

  const handleKeepOverdueToday = (task: TestDayTask) => {
    addDecisionLog(`Zachowano przeterminowane zadanie "${task.title}" na dziś`)
    showToast('Zadanie pozostanie w kolejce', 'info')
  }

  const handlePostponeOverdue = async (task: TestDayTask) => {
    // For now, postpone to tomorrow
    // TODO: Show date picker modal
    await handleNotToday(task, 'Przełożono przeterminowane zadanie')
  }

  const handlePin = async (task: TestDayTask) => {
    const newPinState = !task.is_must
    
    // Check if trying to pin when already at limit (client-side check)
    if (newPinState) {
      const currentPinnedCount = tasks.filter(t => t.is_must).length
      if (currentPinnedCount >= 3) {
        showToast('Maksymalnie 3 zadania MUST! Odepnij coś najpierw.', 'warning')
        return
      }
    }
    
    const response = await authFetch('/api/day-assistant-v2/pin', {
      method: 'POST',
      body: JSON.stringify({ task_id: task.id, pin: newPinState })
    })
    
    if (response.ok) {
      const data = await response.json()
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_must: newPinState } : t))
      addDecisionLog(`${newPinState ? 'Przypięto' : 'Odpięto'} "${task.title}"`)
      showToast(data.message, 'success')
    } else {
      const error = await response.json()
      showToast(error.error || 'Nie udało się zmienić statusu MUST', 'error')
    }
  }

  const handleDecompose = async (task: TestDayTask) => {
    // Show the ClarifyModal for first step workflow
    setClarifyTask(task)
  }

  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    if (!sessionToken) return
    
    try {
      const response = await fetch('/api/day-assistant-v2/subtasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          subtask_id: subtaskId,
          completed
        })
      })
      
      if (response.ok) {
        // Reload tasks to get updated subtask state
        await loadDayPlan(sessionToken)
        showToast(completed ? '✅ Krok ukończony' : 'Krok nieukończony', 'success')
      } else {
        showToast('Nie udało się zaktualizować kroku', 'error')
      }
    } catch (error) {
      console.error('Error toggling subtask:', error)
      showToast('Błąd podczas aktualizacji kroku', 'error')
    }
  }

  const handleDelete = async (task: TestDayTask) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to zadanie?')) return
    
    try {
      const response = await authFetch(`/api/day-assistant-v2/tasks/${task.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setTasks(prev => prev.filter(t => t.id !== task.id))
        addDecisionLog(`Usunięto zadanie "${task.title}"`)
        showToast('🗑️ Zadanie usunięte', 'success')
      } else {
        const error = await response.json()
        showToast(error.error || 'Nie udało się usunąć zadania', 'error')
      }
    } catch (error) {
      console.error('[DayAssistantV2] Delete error:', error)
      showToast('Wystąpił błąd podczas usuwania zadania', 'error')
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
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
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
            {/* Queue Stats */}
            {availableMinutes > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  📊 KOLEJKA NA DZIŚ ({Math.floor(availableMinutes / 60)}h {availableMinutes % 60}min dostępne)
                </p>
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

            {/* Energy/Focus Controls */}
            <EnergyFocusControls
              energy={dayPlan?.energy || 3}
              focus={dayPlan?.focus || 3}
              onEnergyChange={v => updateSliders('energy', v)}
              onFocusChange={v => updateSliders('focus', v)}
            />
            
            {presetButtons}
            
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Filtr kontekstu:</span>
              <div className="flex gap-2 flex-wrap">
                <ContextPill active={contextFilter === 'all'} onClick={() => setContextFilter('all')}>
                  Wszystko
                </ContextPill>
                {(Object.keys(CONTEXT_LABELS) as TaskContext[]).map(ctx => (
                  <ContextPill 
                    key={ctx} 
                    active={contextFilter === ctx} 
                    onClick={() => setContextFilter(ctx as ContextType)}
                    className={contextFilter === ctx ? CONTEXT_COLORS[ctx] : ''}
                  >
                    {CONTEXT_LABELS[ctx]}
                  </ContextPill>
                ))}
              </div>
            </div>
            {lightUsage?.exceeded && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                Po {lightUsage.minutes} min lekkich zadań zaplanuj jedną sesję MUST/deep. Limit: {lightUsage.limit} min.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks Section */}
        <OverdueTasksSection
          overdueTasks={overdueTasks}
          selectedDate={selectedDate}
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

        <Card>
          <CardHeader>
            <CardTitle>📊 Kolejka na dziś ({queue.length} {queue.length === 1 ? 'task' : 'tasków'})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.length === 0 && <p className="text-sm text-muted-foreground">Brak zadań w kolejce</p>}
            {queue.map((task, index) => (
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
                showActions={true}
              />
            ))}
          </CardContent>
        </Card>

        {later.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📋 Na później ({later.length} {later.length === 1 ? 'task' : 'tasków'})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Te zadania nie mieszczą się w dostępnym czasie pracy dzisiaj.
              </p>
              {later.slice(0, 5).map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onNotToday={() => handleNotToday(task)}
                  onStart={() => handleStartTask(task)}
                  onUnmark={() => openUnmarkWarning(task)}
                  onDecompose={() => handleDecompose(task)}
                  onComplete={() => handleComplete(task)}
                  onPin={() => handlePin(task)}
                  onClick={() => setSelectedTask(task)}
                  focus={dayPlan?.focus || 3}
                  selectedDate={selectedDate}
                  isCollapsed={true}
                  onSubtaskToggle={handleSubtaskToggle}
                />
              ))}
              {later.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... i {later.length - 5} więcej
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {showLaterQueue 
                    ? 'Te zadania nie mieszczą się w dostępnym czasie pracy dzisiaj.' 
                    : `📋 ${later.length} ${later.length === 1 ? 'zadanie' : 'zadań'} pozostaje na później`}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowLaterQueue(!showLaterQueue)}
                >
                  {showLaterQueue ? '🔼 Zwiń kolejkę' : '👁️ Pokaż kolejkę'}
                </Button>
              </div>
              
              {showLaterQueue ? (
                <>
                  <div className="border-t pt-3 mt-2">
                    <h3 className="font-semibold mb-3">📋 KOLEJKA NA PÓŹNIEJ</h3>
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
                        showActions={true}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {later.slice(0, 3).map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
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
                      isCollapsed={true}
                    />
                  ))}
                  {later.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ... i {later.length - 3} więcej
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

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
        <Card>
          <CardHeader>
            <CardTitle>Rekomendacje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RecommendationPanel
              dayPlan={dayPlan}
              proposals={proposals}
              onProposalResponse={handleProposalResponse}
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

      {/* Clarify Modal for First Step */}
      {clarifyTask && (
        <ClarifyModal
          task={clarifyTask}
          onClose={() => setClarifyTask(null)}
          onSubmit={() => {
            setClarifyTask(null)
            loadDayPlan(sessionToken || undefined)
            addDecisionLog(`Utworzono pierwszy krok dla "${clarifyTask.title}"`)
            showToast('✅ Pierwszy krok utworzony', 'success')
          }}
          sessionToken={sessionToken}
        />
      )}
    </div>
      </div>
    </TooltipProvider>
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
  showActions,
  onPauseTimer,
  onResumeTimer,
  onCompleteTimer
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
  showActions?: boolean
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
    <div className={cn(
      'border rounded-lg flex flex-col gap-2 bg-white shadow-sm transition-all',
      cardSizeClass,
      borderColorClass,
      onClick && 'cursor-pointer hover:shadow-md'
    )}>
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
            Estymat: {task.estimate_min} min • Load {task.cognitive_load} • Przeniesienia: {task.postpone_count || 0}
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
        {!isCollapsed && showActions && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" onClick={onStart}>
              <Play size={16} className="mr-1" /> Start
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <DotsThree size={20} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onComplete}>
                  <Check size={16} className="mr-2" />
                  Ukończ
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={onNotToday}>
                  <ArrowsClockwise size={16} className="mr-2" />
                  Nie dziś
                </DropdownMenuItem>
                
                {onPin && (
                  <DropdownMenuItem onClick={onPin}>
                    <PushPin size={16} className="mr-2" />
                    {task.is_must ? 'Odepnij' : 'Przypnij jako MUST'}
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={onDecompose}>
                  <MagicWand size={16} className="mr-2" />
                  Dekomponuj
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={onClick}>
                  <Pencil size={16} className="mr-2" />
                  Edytuj
                </DropdownMenuItem>
                
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash size={16} className="mr-2" />
                    Usuń
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {!isCollapsed && !showActions && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onStart(); }}>
              <Play size={16} className="mr-1" /> Start
            </Button>
            {task.is_must && (
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onUnmark(); }}>
                <Prohibit size={16} className="mr-1" /> Odznacz MUST
              </Button>
            )}
          </div>
        )}
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
      
      {!isCollapsed && !showActions && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onNotToday(); }}>
            <ArrowsClockwise size={16} className="mr-1" /> Nie dziś
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDecompose(); }}>
            <MagicWand size={16} className="mr-1" /> 🎯 Zrób pierwszy krok
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onComplete(); }}>
            <Clock size={16} className="mr-1" /> Zakończ
          </Button>
          {onPin && (
            <Button size="sm" variant={task.is_must ? "ghost" : "outline"} onClick={(e) => { e.stopPropagation(); onPin(); }}>
              <PushPin size={16} className="mr-1" /> {task.is_must ? 'Odpnij' : 'Przypnij'}
            </Button>
          )}
          {shouldSuggestTen && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onStart(); }}>
              Zacznij 10 min
            </Button>
          )}
        </div>
      )}
    </div>
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
