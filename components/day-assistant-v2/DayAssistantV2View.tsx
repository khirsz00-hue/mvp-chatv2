/**
 * Day Assistant V2 View - Web Version
 * Main view component for Day Assistant V2 functionality
 * Full-featured ADHD-friendly day planner with intelligent task queue
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { UniversalTaskModal, TaskData } from '@/components/common/UniversalTaskModal'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { TestDayTask, DayPlan, Recommendation, WorkMode } from '@/lib/types/dayAssistantV2'
import { TopStatusBar } from './TopStatusBar'
import { WorkModeBar } from './WorkModeBar'
import { CurrentActivityBox } from './CurrentActivityBox'
import { DayAssistantV2TaskCard } from './DayAssistantV2TaskCard'
import { WorkModeSelector } from './WorkModeSelector'
import { RecommendationPanel } from './RecommendationPanel'
import { Card, CardContent } from '@/components/ui/Card'
import { useTaskTimer } from '@/hooks/useTaskTimer'
import { useDayPlan } from '@/hooks/useDayPlan'
import Button from '@/components/ui/Button'
import { Plus, Clock, CalendarBlank, ChartLineUp } from '@phosphor-icons/react'

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

  // Custom hooks
  const { activeTimer, startTimer, pauseTimer, resumeTimer, stopTimer, formatTime } = useTaskTimer()
  const { energy, focus, updateEnergy, updateFocus } = useDayPlan(
    sessionToken,
    selectedDate,
    dayPlan,
    {
      onUpdate: async () => {
        // Refresh recommendations when sliders change
        await fetchRecommendations()
      }
    }
  )

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
        body: JSON.stringify({ taskId, date: selectedDate })
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
        body: JSON.stringify({ taskId, isMust: newIsMust })
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
        body: JSON.stringify({ taskId })
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
      
      if (editingTask) {
        // Update existing task
        const response = await fetch(`/api/day-assistant-v2/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: taskData.content,
            description: taskData.description,
            estimate_min: taskData.estimated_minutes,
            cognitive_load: taskData.cognitive_load,
            due_date: taskData.due,
            priority: taskData.priority
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
            title: taskData.content,
            description: taskData.description,
            estimate_min: taskData.estimated_minutes,
            cognitive_load: taskData.cognitive_load,
            due_date: taskData.due,
            priority: taskData.priority,
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

  // Filter tasks by work mode
  const filteredTasks = tasks.filter(task => {
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

  // Organize tasks into sections (optimized single pass)
  const { mustTasks, top3Tasks, queueTasks, overflowTasks } = filteredTasks.reduce(
    (acc, task) => {
      if (task.completed) return acc
      
      if (task.is_must) {
        acc.mustTasks.push(task)
      } else if (!task.due_date || task.due_date > selectedDate) {
        acc.overflowTasks.push(task)
      } else if (acc.top3Tasks.length < 3) {
        acc.top3Tasks.push(task)
      } else {
        acc.queueTasks.push(task)
      }
      
      return acc
    },
    {
      mustTasks: [] as TestDayTask[],
      top3Tasks: [] as TestDayTask[],
      queueTasks: [] as TestDayTask[],
      overflowTasks: [] as TestDayTask[]
    }
  )

  // Calculate time stats
  const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimate_min || 0), 0)
  const completedMinutes = tasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + (t.estimate_min || 0), 0)
  const availableMinutes = 480 // 8 hours default
  const usagePercentage = Math.min(100, Math.round((totalEstimatedMinutes / availableMinutes) * 100))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Top Status Bar */}
      <TopStatusBar
        completedToday={taskStats.completedToday}
        totalToday={taskStats.totalToday}
        usedMinutes={completedMinutes}
        availableMinutes={availableMinutes}
        usagePercentage={usagePercentage}
        workMode={workMode}
        activeTimer={activeTimer ? {
          taskId: activeTimer.taskId,
          taskTitle: tasks.find(t => t.id === activeTimer.taskId)?.title || '',
          elapsedSeconds: activeTimer.elapsedSeconds,
          estimatedMinutes: activeTimer.estimatedMinutes
        } : undefined}
        firstInQueue={top3Tasks[0] ? { title: top3Tasks[0].title } : undefined}
      />

      {/* Work Mode Bar */}
      <WorkModeBar
        workMode={workMode}
        workHoursStart="09:00"
        workHoursEnd="17:00"
        onWorkModeChange={handleWorkModeChange}
        usedMinutes={completedMinutes}
        totalCapacity={availableMinutes}
      />

      {/* Main Layout: Content + Sidebar */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Current Activity Box */}
          {activeTimer && (
            <CurrentActivityBox
              activeTimer={activeTimer}
              taskTitle={tasks.find(t => t.id === activeTimer.taskId)?.title}
              breakActive={false}
              breakTimeRemaining={0}
              formatTime={formatTime}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onComplete={() => handleCompleteTask(activeTimer.taskId)}
              onStop={stopTimer}
            />
          )}

          {/* MUST Section */}
          {mustTasks.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4 text-red-600">
                  🔴 MUST (max 3)
                </h2>
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
              </CardContent>
            </Card>
          )}

          {/* Top 3 Section */}
          {top3Tasks.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  ⭐ Top 3
                </h2>
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
              </CardContent>
            </Card>
          )}

          {/* Queue Section */}
          {queueTasks.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  📋 Kolejka ({queueTasks.length})
                </h2>
                <div className="space-y-3">
                  {queueTasks.map((task, idx) => (
                    <DayAssistantV2TaskCard
                      key={task.id}
                      task={task}
                      queuePosition={idx + 4}
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
              </CardContent>
            </Card>
          )}

          {/* Overflow Section */}
          {overflowTasks.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-500">
                  📦 Na później ({overflowTasks.length})
                </h2>
                <div className="space-y-3">
                  {overflowTasks.map(task => (
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
              </CardContent>
            </Card>
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

        {/* Sidebar */}
        <div className="w-80 space-y-6">
          {/* Work Mode Selector */}
          <WorkModeSelector
            value={workMode}
            onChange={handleWorkModeChange}
          />

          {/* AI Recommendations */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <ChartLineUp size={20} className="mr-2" />
                AI Insights
              </h3>
              <RecommendationPanel
                recommendations={recommendations}
                onApply={handleApplyRecommendation}
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Clock size={20} className="mr-2" />
                Statystyki
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ukończone:</span>
                  <span className="font-semibold">{taskStats.completedToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Razem dziś:</span>
                  <span className="font-semibold">{taskStats.totalToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dodane dziś:</span>
                  <span className="font-semibold">{taskStats.addedToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Przesunięte:</span>
                  <span className="font-semibold">{taskStats.movedFromToday}</span>
                </div>
              </div>
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
    </div>
  )
}
