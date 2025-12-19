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
  generateUnmarkMustWarning
} from '@/lib/services/dayAssistantV2RecommendationEngine'
import { Play, XCircle, Clock, ArrowsClockwise, MagicWand, Prohibit } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

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
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskEstimate, setNewTaskEstimate] = useState(25)
  const [newTaskLoad, setNewTaskLoad] = useState(2)
  const [newTaskMust, setNewTaskMust] = useState(false)
  const [newTaskContext, setNewTaskContext] = useState<ContextType>('code')
  const undoTimer = useRef<NodeJS.Timeout | null>(null)

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
          // Only reload if tasks were actually synced
          if (data.task_count > 0 || data.synced_at) {
            console.log('[DayAssistantV2] Background sync completed, reloading data')
            await loadDayPlan(sessionToken)
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

  const authFetch = async (url: string, options: RequestInit = {}) => {
    if (!sessionToken) throw new Error('Brak sesji')
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${sessionToken}`,
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

  const mustTasks = filteredTasks.filter(t => t.is_must).slice(0, 3)
  const matchedTasks = filteredTasks.filter(t => !t.is_must && !t.completed)
  const autoMoved = filteredTasks.filter(t => t.auto_moved)

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
        priority: 3,
        today_flag: true
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

  const handleProposalResponse = async (proposalId: string, action: 'accept_primary' | 'accept_alt' | 'reject', alternativeIndex?: number) => {
    const response = await authFetch('/api/day-assistant-v2/proposal', {
      method: 'POST',
      body: JSON.stringify({ proposal_id: proposalId, action, alternative_index: alternativeIndex })
    })
    if (response.ok) {
      setProposals(prev => prev.filter(p => p.id !== proposalId))
      addDecisionLog(`Obsłużono rekomendację (${action})`)
      await loadDayPlan()
    } else {
      showToast('Nie udało się zaktualizować rekomendacji', 'error')
    }
  }

  const handleComplete = async (task: TestDayTask) => {
    const response = await authFetch('/api/day-assistant-v2/task', {
      method: 'PUT',
      body: JSON.stringify({ task_id: task.id, completed: true, completed_at: new Date().toISOString() })
    })
    if (response.ok) {
      setTasks(prev => prev.filter(t => t.id !== task.id))
      addDecisionLog(`Oznaczono "${task.title}" jako wykonane`)
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
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-brand-purple">Asystent Dnia v2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SliderField
                label="Energia"
                value={dayPlan?.energy || 3}
                onChange={v => updateSliders('energy', v)}
              />
              <SliderField
                label="Skupienie"
                value={dayPlan?.focus || 3}
                onChange={v => updateSliders('focus', v)}
              />
            </div>
            {presetButtons}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Filtr kontekstu:</span>
              <div className="flex gap-2 flex-wrap">
                <ContextPill active={contextFilter === 'all'} onClick={() => setContextFilter('all')}>Wszystko</ContextPill>
                {['code', 'admin', 'komunikacja', 'prywatne'].map(ctx => (
                  <ContextPill key={ctx} active={contextFilter === ctx} onClick={() => setContextFilter(ctx as ContextType)}>
                    {ctx}
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
            <CardTitle>Pinned MUST (max 3)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mustTasks.length === 0 && <p className="text-sm text-muted-foreground">Brak przypiętych zadań MUST</p>}
            {mustTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onNotToday={() => handleNotToday(task)}
                onStart={() => showToast(`Start sesji dla "${task.title}"`, 'info')}
                onUnmark={() => openUnmarkWarning(task)}
                onDecompose={() => showToast('Auto-dekompozycja w przygotowaniu', 'info')}
                onComplete={() => handleComplete(task)}
                focus={dayPlan?.focus || 3}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dopasowane na dziś</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedTasks.length === 0 && <p className="text-sm text-muted-foreground">Dodaj zadanie lub zmień filtry.</p>}
            {matchedTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onNotToday={() => handleNotToday(task)}
                onStart={() => showToast(`Start sesji dla "${task.title}"`, 'info')}
                onUnmark={() => openUnmarkWarning(task)}
                onDecompose={() => showToast('Auto-dekompozycja w przygotowaniu', 'info')}
                onComplete={() => handleComplete(task)}
                focus={dayPlan?.focus || 3}
              />
            ))}
          </CardContent>
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
                  onChange={e => setNewTaskContext(e.target.value as ContextType)}
                >
                  <option value="code">code</option>
                  <option value="admin">admin</option>
                  <option value="komunikacja">komunikacja</option>
                  <option value="prywatne">prywatne</option>
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
            {proposals.length === 0 && <p className="text-sm text-muted-foreground">Brak aktywnych rekomendacji. Zmiany suwaków, „Nie dziś” lub nowe zadania wywołają live replanning.</p>}
            {proposals.slice(0, 1).map(proposal => (
              <div key={proposal.id} className="border rounded-lg p-3 space-y-2">
                <p className="font-medium">{proposal.reason}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleProposalResponse(proposal.id, 'accept_primary')}>Zastosuj</Button>
                  {proposal.alternatives?.map((alt, idx) => (
                    <Button key={idx} size="sm" variant="outline" onClick={() => handleProposalResponse(proposal.id, 'accept_alt', idx)}>
                      Alternatywa {idx + 1}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => handleProposalResponse(proposal.id, 'reject')}>Odrzuć</Button>
                </div>
              </div>
            ))}
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
    </div>
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
  onNotToday,
  onStart,
  onUnmark,
  onDecompose,
  onComplete,
  focus
}: {
  task: TestDayTask
  onNotToday: () => void
  onStart: () => void
  onUnmark: () => void
  onDecompose: () => void
  onComplete: () => void
  focus: number
}) {
  const shouldSuggestTen = focus <= 2 && task.estimate_min > 20
  return (
    <div className={cn(
      'border rounded-lg p-3 flex flex-col gap-2 bg-white shadow-sm',
      task.is_must && 'border-brand-purple/60'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {task.is_must && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">MUST</span>}
            <p className="font-semibold">{task.title}</p>
          </div>
          <p className="text-xs text-muted-foreground">Estymat: {task.estimate_min} min • Load {task.cognitive_load} • Przeniesienia: {task.postpone_count || 0}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onStart}>
            <Play size={16} className="mr-1" /> Start
          </Button>
          {task.is_must && (
            <Button size="sm" variant="ghost" onClick={onUnmark}>
              <Prohibit size={16} className="mr-1" /> Odznacz MUST
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onNotToday}>
          <ArrowsClockwise size={16} className="mr-1" /> Nie dziś
        </Button>
        <Button size="sm" variant="ghost" onClick={onDecompose}>
          <MagicWand size={16} className="mr-1" /> Dekomponuj
        </Button>
        <Button size="sm" variant="ghost" onClick={onComplete}>
          <Clock size={16} className="mr-1" /> Zakończ
        </Button>
        {shouldSuggestTen && (
          <Button size="sm" onClick={() => onStart()}>
            Zacznij 10 min
          </Button>
        )}
      </div>
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
