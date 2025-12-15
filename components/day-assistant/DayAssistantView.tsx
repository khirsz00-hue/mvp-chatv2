'use client'

import { useState, useEffect } from 'react'
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
  ENERGY_MODE_EMOJI
} from '@/lib/types/dayAssistant'
import { supabase } from '@/lib/supabaseClient'

/**
 * Main Day Assistant View
 * 
 * Displays NOW/NEXT/LATER sections with task queue management
 */
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
  const [activeTab, setActiveTab] = useState<'tasks' | 'timeline' | 'chat'>('tasks')

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  // Fetch queue state and energy mode
  useEffect(() => {
    if (!userId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch queue state
        const queueResponse = await fetch(`/api/day-assistant/queue?userId=${userId}`)
        if (queueResponse.ok) {
          const queue = await queueResponse.json()
          setQueueState(queue)
        }

        // Fetch energy mode
        const energyResponse = await fetch(`/api/day-assistant/energy-mode?userId=${userId}`)
        if (energyResponse.ok) {
          const energy = await energyResponse.json()
          setEnergyMode(energy.current_mode || 'normal')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        showToast('Błąd podczas ładowania danych', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId, showToast])

  const refreshQueue = async (includeLater = false) => {
    if (!userId) return

    try {
      const url = `/api/day-assistant/queue?userId=${userId}${includeLater ? '&includeLater=true' : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const queue = await response.json()
        setQueueState(queue)
      }
    } catch (error) {
      console.error('Error refreshing queue:', error)
    }
  }
  
  const handleExpandLater = async () => {
    if (!showLaterExpanded) {
      // Fetch LATER tasks when expanding
      await refreshQueue(true)
    }
    setShowLaterExpanded(!showLaterExpanded)
  }

  const handleEnergyModeChange = async (newMode: EnergyMode) => {
    if (!userId) return

    try {
      const response = await fetch('/api/day-assistant/energy-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mode: newMode })
      })

      if (response.ok) {
        setEnergyMode(newMode)
        showToast(`Tryb zmieniony na ${ENERGY_MODE_EMOJI[newMode]}`, 'success')
        await refreshQueue()  // Refresh to apply new constraints
      }
    } catch (error) {
      console.error('Error changing energy mode:', error)
      showToast('Błąd podczas zmiany trybu', 'error')
    }
  }

  const handleTaskAction = async (taskId: string, action: 'pin' | 'postpone' | 'escalate') => {
    if (!userId) return

    try {
      const response = await fetch('/api/day-assistant/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId, action })
      })

      if (response.ok) {
        const actionEmojis = { pin: '📌', postpone: '🧊', escalate: '🔥' }
        showToast(`Akcja ${actionEmojis[action]} wykonana`, 'success')
        await refreshQueue()
      }
    } catch (error) {
      console.error('Error performing action:', error)
      showToast('Błąd podczas wykonywania akcji', 'error')
    }
  }

  const handleGenerateSubtasks = (task: DayTask) => {
    setSelectedTask(task)
    setShowSubtaskModal(true)
  }

  const handleCompleteTask = async (taskId: string) => {
    if (!userId) return

    try {
      const response = await fetch('/api/day-assistant/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, completed: true })
      })

      if (response.ok) {
        showToast('Zadanie ukończone! 🎉', 'success')
        await refreshQueue()
      }
    } catch (error) {
      console.error('Error completing task:', error)
      showToast('Błąd podczas oznaczania jako ukończone', 'error')
    }
  }

  const handleUndoLastAction = async () => {
    if (!userId) return

    try {
      const response = await fetch('/api/day-assistant/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        showToast('Cofnięto ostatnią zmianę', 'success')
        await refreshQueue()
      } else {
        showToast('Brak akcji do cofnięcia', 'info')
      }
    } catch (error) {
      console.error('Error undoing action:', error)
      showToast('Błąd podczas cofania', 'error')
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

  const handleChatAction = (recommendation: any) => {
    // Handle chat recommendation actions
    showToast('Akcja zastosowana', 'success')
    refreshQueue()
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

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'tasks' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('tasks')}
        >
          📝 Zadania
        </Button>
        <Button
          variant={activeTab === 'timeline' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('timeline')}
        >
          📅 Harmonogram
        </Button>
        <Button
          variant={activeTab === 'chat' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('chat')}
        >
          💬 Czat
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'tasks' && (
          <div className="h-full overflow-y-auto space-y-4">
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
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && userId && (
          <div className="h-full">
            <DayTimeline
              userId={userId}
              onRefresh={refreshQueue}
            />
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && userId && (
          <div className="h-full">
            <DayChat
              userId={userId}
              onActionApply={handleChatAction}
            />
          </div>
        )}
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
