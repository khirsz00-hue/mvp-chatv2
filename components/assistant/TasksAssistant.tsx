'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { Plus, List, Kanban, CalendarBlank, SortAscending, Timer as TimerIcon } from '@phosphor-icons/react'
import { startOfDay, addDays, parseISO, isSameDay, isBefore, isWithinInterval } from 'date-fns'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailsModal } from './TaskDetailsModal'
import { TaskCard } from './TaskCard'
import { SevenDaysBoardView } from './SevenDaysBoardView'
import { TaskTimer } from './TaskTimer'
import { PomodoroTimer } from './PomodoroTimer'
import { AIInsightsPanel } from './AIInsightsPanel'

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

type FilterType = 'today' | 'tomorrow' | 'week' | 'month' | 'overdue' | 'all'
type ViewType = 'list' | 'board'
type SortType = 'date' | 'priority' | 'name'

export function TasksAssistant() {
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewType>('list')
  const [filter, setFilter] = useState<FilterType>('today')
  const [sortBy, setSortBy] = useState<SortType>('date')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  // Fetch tasks
  useEffect(() => {
    if (! token) return
    fetchTasks()
    
    // Poll every 45 seconds
    const interval = setInterval(() => {
      fetchTasks()
    }, 45000)
    
    return () => clearInterval(interval)
  }, [token])
  
  // Fetch projects
  useEffect(() => {
    if (!token) return
    fetchProjects()
  }, [token])
  
  const fetchTasks = async () => {
    setLoading(true)
    try {
      console.log('🔍 Fetching tasks with token:', token ?  'EXISTS' : 'MISSING')
      
      const res = await fetch(`/api/todoist/tasks?token=${token}`)
      
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
  }
  
  const fetchProjects = async () => {
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
  }
  
  // Filter tasks by date
  const filterTasks = (tasks: Task[], filterType: FilterType) => {
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
      if (task.completed) {
        console.log('⏭️ Skipping completed task:', task.content)
        return false
      }
      
      const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
      
      if (filterType === 'all') return true
      
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
    
    console.log('✅ Filtered tasks result:', filtered. length, filtered)
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
  
  console.log('🎯 FINAL SORTED TASKS:', sortedTasks)
  
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
      
      // Refresh tasks to get updated list
      setTimeout(() => fetchTasks(), 500)
      
    } catch (err: any) {
      console.error('❌ Error creating task:', err)
      showToast('Nie udało się utworzyć zadania: ' + (err?.message || ''), 'error')
    }
  }
  
  const handleComplete = async (taskId: string) => {
    try {
      const res = await fetch('/api/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, token })
      })
      
      if (!res.ok) throw new Error('Failed to complete task')
      
      setTasks(prev => prev.filter(t => t.id !== taskId))
      showToast('Zadanie ukończone!', 'success')
      
      console.log('✅ Zadanie ukończone!')
    } catch (err) {
      console.error('Error completing task:', err)
      showToast('Nie udało się ukończyć zadania', 'error')
    }
  }
  
  const handleDelete = async (taskId: string) => {
    try {
      const res = await fetch('/api/todoist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, token })
      })
      
      if (!res.ok) throw new Error('Failed to delete task')
      
      setTasks(prev => prev.filter(t => t.id !== taskId))
      showToast('Zadanie usunięte', 'success')
      
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
      await handleUpdate(taskId, { due: newDate }, false)
      showToast('Zadanie przeniesione', 'success')
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
  
  // OAuth Connection Screen
  if (! token) {
    const handleOAuthConnect = () => {
      const clientId = process.env.NEXT_PUBLIC_TODOIST_CLIENT_ID
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectUri = `${baseUrl}/api/todoist/callback`
      const authUrl = `https://todoist.com/oauth/authorize? client_id=${clientId}&scope=data:read_write&state=mvp-chatv2`
      
      window.location.href = authUrl
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Zarządzanie Zadaniami</h1>
          <p className="text-gray-600 mt-1">Organizuj swoje zadania efektywnie</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* View switcher */}
          <div className="inline-flex rounded-lg border p-1 bg-white">
            <button 
              onClick={() => setView('list')}
              className={`px-3 py-2 rounded transition flex items-center gap-2 ${
                view === 'list' 
                  ? 'bg-brand-purple text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Widok listy"
            >
              <List size={18} weight="bold" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button 
              onClick={() => setView('board')}
              className={`px-3 py-2 rounded transition flex items-center gap-2 ${
                view === 'board' 
                  ? 'bg-brand-purple text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Widok tablicy"
            >
              <Kanban size={18} weight="bold" />
              <span className="hidden sm:inline">Tablica</span>
            </button>
          </div>
          
          {/* Sort dropdown */}
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target. value as SortType)}
            className="px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple text-sm"
          >
            <option value="date">📅 Data</option>
            <option value="priority">🚩 Priorytet</option>
            <option value="name">🔤 Nazwa</option>
          </select>
          
          {/* Project filter */}
          <select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target. value)}
            className="px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus: ring-brand-purple text-sm"
          >
            <option value="all">📁 Wszystkie projekty</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          <Badge variant="secondary" className="text-sm">
            {sortedTasks.length} {sortedTasks.length === 1 ? 'zadanie' : 'zadań'}
          </Badge>
          
          <Button 
            onClick={() => setShowPomodoro(true)} 
            variant="outline"
            className="gap-2"
            title="Pomodoro Timer"
          >
            🍅
          </Button>
          
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="gap-2"
          >
            <Plus size={20} weight="bold" />
            <span className="hidden sm:inline">Dodaj zadanie</span>
          </Button>
        </div>
      </div>
      
      {/* AI Insights Panel */}
      <AIInsightsPanel tasks={tasks} />
      
      {/* Filters */}
      {view === 'list' && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="today">Dziś</TabsTrigger>
            <TabsTrigger value="tomorrow">Jutro</TabsTrigger>
            <TabsTrigger value="week">Tydzień</TabsTrigger>
            <TabsTrigger value="month">Miesiąc</TabsTrigger>
            <TabsTrigger value="overdue">Przeterminowane</TabsTrigger>
          </TabsList>
        </Tabs>
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
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus size={18} />
                Dodaj pierwsze zadanie
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedTasks.map(task => (
                <TaskCard 
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  onDetails={(t) => {
                    setSelectedTask(t)
                    setShowDetailsModal(true)
                  }}
                />
              ))}
            </div>
          )
        ) : (
          <SevenDaysBoardView 
            tasks={tasks. filter(t => ! t.completed)}
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
        )}
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
