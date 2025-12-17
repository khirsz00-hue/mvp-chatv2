'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Fire, Snowflake, PushPin, ArrowsClockwise, Plus } from '@phosphor-icons/react'
import { EnergyModeSwitcher } from './EnergyModeSwitcher'
import { DayTaskCard } from './DayTaskCard'
import { CreateTaskModal } from './CreateTaskModal'
import { SubtaskModal } from './SubtaskModal'
import { DayChat } from './DayChat'
import { DayTimeline } from './DayTimeline'
import {
  DayTask,
  QueueState,
  EnergyMode,
  DayPriority,
  ENERGY_MODE_EMOJI
} from '@/lib/types/dayAssistant'
import { supabase } from '@/lib/supabaseClient'
import { syncWithTodoist, shouldSync } from '@/lib/services/dayAssistantSync'
import { apiGet, apiPost, apiPut } from '@/lib/api'

/**
 * Main Day Assistant View
 * 
 * Displays NOW/NEXT/LATER sections with task queue management
 */
// Debounce timing constants
const REFRESH_DEBOUNCE_MS = 500
const ACTION_COMPLETE_DELAY_MS = 500 // Delay before releasing action flag
const MIN_ENERGY_MODE_FETCH_INTERVAL_MS = 1000 // Minimum interval between energy mode fetches

export function DayAssistantView() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [queueState, setQueueState] = useState<QueueState>({
    now: null,
    next: [],
    later: [],
    laterCount: 0
  })
  const [energyMode, setEnergyMode] = useState<EnergyMode>('normal')
  const [userId, setUserId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSubtaskModal, setShowSubtaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<DayTask | null>(null)
  const [showLaterExpanded, setShowLaterExpanded] = useState(false)
  const [rightPanelView, setRightPanelView] = useState<'timeline' | 'chat'>('chat')
  const showToastRef = useRef(showToast)
  
  // Debounce/lock mechanism for refreshQueue
  const refreshLockRef = useRef(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Action flag to disable autosync during user actions
  const actionInProgressRef = useRef(false)
  
  // Energy mode fetch lock to prevent parallel requests
  const energyModeFetchLockRef = useRef(false)
  const lastEnergyModeFetchRef = useRef<number>(0)

  // Keep toast reference stable inside effects to avoid unnecessary reload loops
  useEffect(() => {
    showToastRef.current = showToast
  }, [showToast])

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔍 [DayAssistant] Current user:', user?.id)
      
      if (user?.id) {
        setUserId(user.id)
      } else {
        console.error('❌ [DayAssistant] No user ID found')
        showToastRef.current('Please log in to use Day Assistant', 'error')
      }
    }
    getCurrentUser()
  }, [])

  // Fetch queue state and energy mode + auto-sync with Todoist
  useEffect(() => {
    if (!userId) return

    const fetchData = async () => {
      setLoading(true)
      let hasShown401Toast = false // Track if we've shown auth error toast
      
      try {
        console.log('🔍 [DayAssistant] Initializing sync for user:', userId)
        
        // Auto-sync with Todoist on mount (if needed) - uses cached token
        if (shouldSync()) {
          console.log('🔍 [DayAssistant] Starting Todoist sync...')
          const result = await syncWithTodoist(userId)
          if (result.success) {
            console.log('✅ [DayAssistant] Sync completed successfully')
          }
        }
        
        // Fetch both queue and energy mode in parallel (single batch, not cascade)
        const [queueResponse, energyResponse] = await Promise.all([
          apiGet(`/api/day-assistant/queue`),
          apiGet(`/api/day-assistant/energy-mode`)
        ])
        
        // Handle queue response
        if (queueResponse.ok) {
          const queue = await queueResponse.json()
          setQueueState(queue)
        } else if (queueResponse.status === 401) {
          console.error('❌ [DayAssistant] Session missing - user not authenticated')
          if (!hasShown401Toast) {
            showToastRef.current('Zaloguj się, aby korzystać z Asystenta Dnia', 'error')
            hasShown401Toast = true
          }
        } else {
          console.error('❌ [DayAssistant] Queue fetch failed:', await queueResponse.text())
          showToastRef.current('Błąd podczas ładowania kolejki', 'error')
        }

        // Handle energy mode response
        if (energyResponse.ok) {
          const energy = await energyResponse.json()
          setEnergyMode(energy.current_mode || 'normal')
          lastEnergyModeFetchRef.current = Date.now()
        } else if (energyResponse.status === 401) {
          console.error('❌ [DayAssistant] Session missing - user not authenticated')
          // Don't show duplicate toast
        } else {
          console.error('❌ [DayAssistant] Energy mode fetch failed:', await energyResponse.text())
        }
      } catch (error) {
        console.error('❌ [DayAssistant] Error fetching data:', error)
        showToastRef.current('Błąd podczas ładowania danych', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])
  
  const refreshQueue = useCallback(async (includeLater = false) => {
    if (!userId) return
    
    // Debounce/lock: prevent concurrent refreshes
    if (refreshLockRef.current) {
      console.log('⏳ [DayAssistant] Refresh already in progress, skipping...')
      return
    }
    
    // Set lock to prevent concurrent refreshes (no global spinner)
    refreshLockRef.current = true

    try {
      const url = `/api/day-assistant/queue${includeLater ? '?includeLater=true' : ''}`
      const response = await apiGet(url)
      if (response.ok) {
        const queue = await response.json()
        setQueueState(queue)
      } else {
        console.error('❌ [DayAssistant] Queue refresh failed:', await response.text())
      }
    } catch (error) {
      console.error('❌ [DayAssistant] Error refreshing queue:', error)
    } finally {
      // Clear any pending timeout before setting new one (prevent race conditions)
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      // Release lock after a short delay to prevent rapid-fire refreshes
      refreshTimeoutRef.current = setTimeout(() => {
        refreshLockRef.current = false
      }, REFRESH_DEBOUNCE_MS)
    }
  }, [userId])
  
  // Background polling sync (12s interval) - only when token available
  // Disabled during user actions to prevent conflicts
  useEffect(() => {
    if (!userId) return
    
    const syncInterval = setInterval(async () => {
      // Skip sync if action is in progress
      if (actionInProgressRef.current) {
        console.log('⏸️ [DayAssistant] Skipping autosync - action in progress')
        return
      }
      
      if (shouldSync()) {
        const result = await syncWithTodoist(userId)
        if (result.success && result.taskCount > 0) {
          // Refresh queue after successful sync (debounced)
          await refreshQueue()
        }
      }
    }, 12000) // 12 seconds
    
    return () => clearInterval(syncInterval)
  }, [userId, refreshQueue])
  
  // Cleanup refresh timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])
  
  const handleExpandLater = async () => {
    if (!showLaterExpanded) {
      // Fetch LATER tasks when expanding
      await refreshQueue(true)
    }
    setShowLaterExpanded(!showLaterExpanded)
  }

  const handleEnergyModeChange = async (newMode: EnergyMode) => {
    if (!userId) return
    
    // Prevent parallel energy mode changes
    if (energyModeFetchLockRef.current) {
      console.log('⏳ [DayAssistant] Energy mode change already in progress, skipping...')
      return
    }
    
    // Check minimum interval
    const now = Date.now()
    if (now - lastEnergyModeFetchRef.current < MIN_ENERGY_MODE_FETCH_INTERVAL_MS) {
      console.log('⏳ [DayAssistant] Energy mode change too soon, debouncing...')
      return
    }
    
    // Set action flag to disable autosync
    actionInProgressRef.current = true
    energyModeFetchLockRef.current = true

    try {
      const response = await apiPost('/api/day-assistant/energy-mode', { mode: newMode })

      if (response.ok) {
        setEnergyMode(newMode)
        lastEnergyModeFetchRef.current = Date.now()
        showToast(`Tryb zmieniony na ${ENERGY_MODE_EMOJI[newMode]}`, 'success')
        await refreshQueue()  // Refresh to apply new constraints
      } else {
        console.error('❌ [DayAssistant] Energy mode update failed:', await response.text())
        showToast('Błąd podczas zmiany trybu', 'error')
      }
    } catch (error) {
      console.error('Error changing energy mode:', error)
      showToast('Błąd podczas zmiany trybu', 'error')
    } finally {
      energyModeFetchLockRef.current = false
      // Release action flag after short delay
      setTimeout(() => {
        actionInProgressRef.current = false
      }, ACTION_COMPLETE_DELAY_MS)
    }
  }

  const handleTaskAction = async (taskId: string, action: 'pin' | 'postpone' | 'escalate') => {
    if (!userId) return
    
    // Set action flag to disable autosync
    actionInProgressRef.current = true

    // Find the task being acted upon
    const task = [queueState.now, ...queueState.next, ...queueState.later].find(t => t?.id === taskId)
    if (!task) {
      console.error('Task not found:', taskId)
      actionInProgressRef.current = false
      return
    }

    // Store previous state for rollback
    const previousQueueState = { ...queueState }

    // Optimistic UI update - instant visual feedback
    let newQueueState: QueueState = { ...queueState }
    
    switch (action) {
      case 'escalate':
        // Move task to NOW, push current NOW to NEXT
        newQueueState = {
          now: { ...task, priority: 'now' as DayPriority, is_mega_important: true },
          next: [
            ...(queueState.now ? [{ ...queueState.now, priority: 'next' as DayPriority }] : []),
            ...queueState.next.filter(t => t.id !== taskId)
          ],
          later: queueState.later.filter(t => t.id !== taskId),
          laterCount: queueState.later.filter(t => t.id !== taskId).length
        }
        break
      
      case 'pin':
        // Move task to NEXT if not already there, mark as pinned
        if (task.priority !== 'next') {
          newQueueState = {
            now: queueState.now?.id === taskId ? null : queueState.now,
            next: [
              { ...task, priority: 'next' as DayPriority, is_pinned: true },
              ...queueState.next.filter(t => t.id !== taskId)
            ],
            later: queueState.later.filter(t => t.id !== taskId),
            laterCount: queueState.later.filter(t => t.id !== taskId).length
          }
        } else {
          newQueueState = {
            ...queueState,
            next: queueState.next.map(t => 
              t.id === taskId ? { ...t, is_pinned: true } : t
            )
          }
        }
        break
      
      case 'postpone':
        // Move task to LATER
        newQueueState = {
          now: queueState.now?.id === taskId ? null : queueState.now,
          next: queueState.next.filter(t => t.id !== taskId),
          later: [
            ...queueState.later,
            { ...task, priority: 'later' as DayPriority, is_pinned: false }
          ],
          laterCount: queueState.later.length + 1
        }
        break
    }

    // Apply optimistic update immediately
    setQueueState(newQueueState)

    // Show immediate feedback
    const actionMessages = {
      pin: '📌 Zadanie przypięte do dzisiaj',
      postpone: '🧊 Zadanie odłożone na później',
      escalate: '🔥 Zadanie przeniesione do NOW jako mega ważne'
    }
    showToast(actionMessages[action], 'success')

    try {
      // Fire API call in background
      const response = await apiPost('/api/day-assistant/actions', { taskId, action })

      if (response.ok) {
        // API succeeded - refresh to get accurate state from server
        await refreshQueue()
      } else {
        // API failed - rollback to previous state
        console.error('Action API failed, rolling back')
        setQueueState(previousQueueState)
        showToast('Błąd podczas wykonywania akcji', 'error')
      }
    } catch (error) {
      // Network error - rollback to previous state
      console.error('Error performing action:', error)
      setQueueState(previousQueueState)
      showToast('Błąd podczas wykonywania akcji', 'error')
    } finally {
      // Release action flag after short delay
      setTimeout(() => {
        actionInProgressRef.current = false
      }, ACTION_COMPLETE_DELAY_MS)
    }
  }

  const handleGenerateSubtasks = (task: DayTask) => {
    setSelectedTask(task)
    setShowSubtaskModal(true)
  }

  const handleCompleteTask = async (taskId: string) => {
    if (!userId) return
    
    // Set action flag to disable autosync
    actionInProgressRef.current = true

    // Store previous state for rollback
    const previousQueueState = { ...queueState }

    // Optimistic UI update - remove completed task immediately
    const newQueueState: QueueState = {
      now: queueState.now?.id === taskId ? null : queueState.now,
      next: queueState.next.filter(t => t.id !== taskId),
      later: queueState.later.filter(t => t.id !== taskId),
      laterCount: queueState.later.filter(t => t.id !== taskId).length
    }
    
    setQueueState(newQueueState)
    showToast('Zadanie ukończone! 🎉', 'success')

    try {
      const response = await apiPut('/api/day-assistant/tasks', { taskId, completed: true })

      if (response.ok) {
        // Refresh to sync with server state
        await refreshQueue()
      } else {
        // Rollback on failure
        setQueueState(previousQueueState)
        showToast('Błąd podczas oznaczania jako ukończone', 'error')
      }
    } catch (error) {
      console.error('Error completing task:', error)
      setQueueState(previousQueueState)
      showToast('Błąd podczas oznaczania jako ukończone', 'error')
    } finally {
      // Release action flag after short delay
      setTimeout(() => {
        actionInProgressRef.current = false
      }, ACTION_COMPLETE_DELAY_MS)
    }
  }

  const handleUndoLastAction = async () => {
    if (!userId) return
    
    // Set action flag to disable autosync
    actionInProgressRef.current = true

    try {
      const response = await apiPost('/api/day-assistant/undo', {})

      if (response.ok) {
        showToast('Cofnięto ostatnią zmianę', 'success')
        await refreshQueue()
      } else {
        showToast('Brak akcji do cofnięcia', 'info')
      }
    } catch (error) {
      console.error('Error undoing action:', error)
      showToast('Błąd podczas cofania', 'error')
    } finally {
      // Release action flag after short delay
      setTimeout(() => {
        actionInProgressRef.current = false
      }, ACTION_COMPLETE_DELAY_MS)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie asystenta dnia...</p>
        </div>
      </div>
    )
  }



  return (
    <div className="h-full flex flex-col">
      {/* Header with Energy Mode Switcher */}
      <div className="glass p-4 rounded-2xl mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-purple">Asystent Dnia</h1>
          <p className="text-sm text-muted-foreground">Twój współpilot na dziś</p>
        </div>
        
        <div className="flex items-center gap-4">
          <EnergyModeSwitcher
            currentMode={energyMode}
            onChange={handleEnergyModeChange}
          />
          
          <Button
            variant="ghost"
            onClick={handleUndoLastAction}
            title="Cofnij ostatnią zmianę"
          >
            <ArrowsClockwise size={20} />
          </Button>

          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={20} className="mr-2" />
            Dodaj zadanie
          </Button>
        </div>
      </div>

      {/* Main Content - Side by Side Layout */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Left: Task Queue (NOW/NEXT/LATER) */}
        <div className="w-1/2 h-full overflow-y-auto space-y-4">
        {/* NOW Section */}
        <Card className="border-2 border-brand-purple">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">NOW - Teraz</CardTitle>
                <CardDescription>Aktywne zadanie</CardDescription>
              </div>
              {queueState.now && (
                <Button
                  variant="ghost"
                  onClick={() => handleGenerateSubtasks(queueState.now!)}
                  title="Generuj kroki"
                >
                  🧠 Generuj kroki
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {queueState.now ? (
              <DayTaskCard
                task={queueState.now}
                section="now"
                onPin={() => handleTaskAction(queueState.now!.id, 'pin')}
                onPostpone={() => handleTaskAction(queueState.now!.id, 'postpone')}
                onEscalate={() => handleTaskAction(queueState.now!.id, 'escalate')}
                onComplete={() => handleCompleteTask(queueState.now!.id)}
                onGenerateSubtasks={() => handleGenerateSubtasks(queueState.now!)}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg mb-2">Brak aktywnego zadania</p>
                <p className="text-sm">Wybierz zadanie z kolejki NEXT lub dodaj nowe</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NEXT Section */}
        <Card className="border-2 border-green-500/50">
          <CardHeader>
            <CardTitle className="text-xl">NEXT - Następne</CardTitle>
            <CardDescription>
              {queueState.next.length} zadań w kolejce
            </CardDescription>
          </CardHeader>
          <CardContent>
            {queueState.next.length > 0 ? (
              <div className="space-y-3">
                {queueState.next.map((task) => (
                  <DayTaskCard
                    key={task.id}
                    task={task}
                    section="next"
                    onPin={() => handleTaskAction(task.id, 'pin')}
                    onPostpone={() => handleTaskAction(task.id, 'postpone')}
                    onEscalate={() => handleTaskAction(task.id, 'escalate')}
                    onComplete={() => handleCompleteTask(task.id)}
                    onGenerateSubtasks={() => handleGenerateSubtasks(task)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Brak zadań w kolejce</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LATER Section */}
        <Card className="border-2 border-gray-300/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">LATER - Później</CardTitle>
                <CardDescription>
                  {queueState.laterCount > 0 ? (
                    <span className="text-brand-purple font-semibold">
                      +{queueState.laterCount} zadań
                    </span>
                  ) : (
                    'Brak zadań'
                  )}
                </CardDescription>
              </div>
              {queueState.laterCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleExpandLater}
                >
                  {showLaterExpanded ? 'Zwiń' : 'Rozwiń'}
                </Button>
              )}
            </div>
          </CardHeader>
          {showLaterExpanded && queueState.laterCount > 0 && (
            <CardContent>
              <div className="space-y-3">
                {queueState.later.map((task) => (
                  <DayTaskCard
                    key={task.id}
                    task={task}
                    section="later"
                    onPin={() => handleTaskAction(task.id, 'pin')}
                    onPostpone={() => handleTaskAction(task.id, 'postpone')}
                    onEscalate={() => handleTaskAction(task.id, 'escalate')}
                    onComplete={() => handleCompleteTask(task.id)}
                    onGenerateSubtasks={() => handleGenerateSubtasks(task)}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
        </div>

        {/* Right: Timeline / Chat Switcher */}
        <div className="w-1/2 h-full flex flex-col">
          {/* Tab Switcher */}
          <div className="glass p-2 rounded-t-2xl flex gap-2 mb-0">
            <Button
              variant={rightPanelView === 'chat' ? 'default' : 'ghost'}
              onClick={() => setRightPanelView('chat')}
              className="flex-1"
            >
              💬 Czat
            </Button>
            <Button
              variant={rightPanelView === 'timeline' ? 'default' : 'ghost'}
              onClick={() => setRightPanelView('timeline')}
              className="flex-1"
            >
              📅 Harmonogram
            </Button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {rightPanelView === 'chat' && userId && (
              <DayChat
                userId={userId}
                onActionApply={async (recommendation) => {
                  // Handle applying recommendations from chat
                  console.log('Applying recommendation:', recommendation)
                  
                  // Set action flag to disable autosync
                  actionInProgressRef.current = true
                  
                  try {
                    const response = await apiPost('/api/day-assistant/recommendations/apply', {
                      recommendation
                    })

                    if (response.ok) {
                      const result = await response.json()
                      if (result.success) {
                        showToast(result.message || 'Rekomendacja zastosowana! ✅', 'success')
                        // Single refresh of queue (no cascade)
                        await refreshQueue()
                      } else {
                        showToast('Nie udało się zastosować wszystkich akcji', 'warning')
                      }
                    } else {
                      const error = await response.json()
                      showToast(error.error || 'Błąd podczas stosowania rekomendacji', 'error')
                    }
                  } catch (error) {
                    console.error('Error applying recommendation:', error)
                    showToast('Błąd podczas stosowania rekomendacji', 'error')
                  } finally {
                    // Release action flag after short delay
                    setTimeout(() => {
                      actionInProgressRef.current = false
                    }, ACTION_COMPLETE_DELAY_MS)
                  }
                }}
              />
            )}
            {rightPanelView === 'timeline' && userId && (
              <DayTimeline
                userId={userId}
                queueState={queueState}
                onRefresh={refreshQueue}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTaskModal
          userId={userId!}
          onClose={() => setShowCreateModal(false)}
          onCreated={refreshQueue}
        />
      )}

      {showSubtaskModal && selectedTask && (
        <SubtaskModal
          task={selectedTask}
          energyMode={energyMode}
          userId={userId!}
          onClose={() => {
            setShowSubtaskModal(false)
            setSelectedTask(null)
          }}
          onGenerated={refreshQueue}
        />
      )}
    </div>
  )
}
