/**
 * Day Assistant V2 View - Web Version
 * Main view component for Day Assistant V2 functionality
 * Full-featured ADHD-friendly day planner with intelligent task queue
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UniversalTaskModal, TaskData } from '@/components/common/UniversalTaskModal'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { TestDayTask, DayPlan, Recommendation, WorkMode } from '@/lib/types/dayAssistantV2'
import { DayAssistantV2TopBar } from './DayAssistantV2TopBar'
import { ActiveTimerBar } from './ActiveTimerBar'
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

  const handleWorkHoursChange = (start: string, end: string) => {
    setWorkHoursStart(start)
    setWorkHoursEnd(end)
    // Could persist to backend if needed
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
    // Placeholder for meetings refresh
    toast.info('🔄 Odświeżanie spotkań...')
  }

  // Filter tasks by work mode and project
  const filteredTasks = tasks.filter(task => {
    // Filter by project if selected
    if (selectedProjectId && task.project_id !== selectedProjectId) {
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

  // Organize tasks into sections (optimized single pass)
  const { mustTasks, top3Tasks, queueTasks, overflowTasks, overdueTasks } = filteredTasks.reduce(
    (acc, task) => {
      if (task.completed) return acc
      
      // Check if overdue
      if (task.due_date && task.due_date < selectedDate) {
        acc.overdueTasks.push(task)
      } else if (task.is_must) {
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
      overflowTasks: [] as TestDayTask[],
      overdueTasks: [] as TestDayTask[]
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
      {/* Conditional Top Bar - Light mode when no timer, Dark mode when timer active */}
      {activeTimer ? (
        <ActiveTimerBar
          taskTitle={tasks.find(t => t.id === activeTimer.taskId)?.title || ''}
          elapsedSeconds={activeTimer.elapsedSeconds}
          estimatedMinutes={activeTimer.estimatedMinutes}
          isPaused={activeTimer.isPaused || false}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={stopTimer}
          onComplete={() => handleCompleteTask(activeTimer.taskId)}
        />
      ) : (
        <DayAssistantV2TopBar
          selectedDate={selectedDate}
          workHoursStart={workHoursStart}
          workHoursEnd={workHoursEnd}
          capacityMinutes={availableMinutes}
          workMode={workMode}
          completedMinutes={completedMinutes}
          onWorkHoursChange={handleWorkHoursChange}
          onWorkModeChange={handleWorkModeChange}
        />
      )}

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
            <Card className="mb-6 border-l-4 border-l-red-600">
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
            <Card className="mb-6 border-2 border-purple-300">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4 text-purple-900">
                  ⭐ Top 3 zadania na dziś
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

          {/* Queue Section - Collapsible */}
          {queueTasks.length > 0 && (
            <Card className="mb-6">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setQueueCollapsed(!queueCollapsed)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {queueCollapsed ? <CaretDown size={20} /> : <CaretUp size={20} />}
                    📋 Kolejka ({queueTasks.length})
                  </CardTitle>
                </div>
              </CardHeader>
              {!queueCollapsed && (
                <CardContent className="pt-0">
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
              )}
            </Card>
          )}

          {/* Overflow Section - Collapsible */}
          {overflowTasks.length > 0 && (
            <Card className="mb-6">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setOverflowCollapsed(!overflowCollapsed)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-600">
                    {overflowCollapsed ? <CaretDown size={20} /> : <CaretUp size={20} />}
                    📦 Zadania na dziś, które nie zmieszczą się w dostępnym czasie pracy ({overflowTasks.length})
                  </CardTitle>
                </div>
              </CardHeader>
              {!overflowCollapsed && (
                <CardContent className="pt-0">
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
              )}
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
    </div>
  )
}
