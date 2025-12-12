'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CalendarBlank, Plus, CheckCircle, Trash, DotsThree } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { format, isToday, isTomorrow, isWithinInterval, addDays, parseISO, isPast } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailsModal } from './TaskDetailsModal'

interface Task {
  id: string
  content: string
  description?:  string
  project_id?: string
  priority: 1 | 2 | 3 | 4
  due?: { date: string } | string
  completed?: boolean
  created_at?:  string
}

export function TasksAssistant() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('today')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  useEffect(() => {
    if (!token) {
      console.log('No Todoist token found')
      return
    }
    
    fetchTasks()
  }, [token])
  
  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/todoist/tasks?token=${token}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      
      const data = await res.json()
      setTasks(data.tasks || data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const filterTasks = (tasks: Task[]) => {
    const now = new Date()
    
    return tasks.filter(task => {
      if (task.completed) return false
      
      const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
      if (!dueStr) return filter === 'inbox'
      
      try {
        const dueDate = parseISO(dueStr)
        
        switch (filter) {
          case 'today':
            return isToday(dueDate)
          case 'tomorrow': 
            return isTomorrow(dueDate)
          case 'week':
            return isWithinInterval(dueDate, { start: now, end: addDays(now, 7) })
          case 'month':
            return isWithinInterval(dueDate, { start:  now, end: addDays(now, 30) })
          case 'overdue':
            return isPast(dueDate) && !isToday(dueDate)
          default:
            return true
        }
      } catch {
        return false
      }
    })
  }
  
  const handleAddTask = async (taskData: any) => {
    try {
      const res = await fetch('/api/todoist/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      })
      
      if (!res.ok) throw new Error('Failed to create task')
      
      const data = await res.json()
      setTasks(prev => [...prev, data.task || data])
      
      console.log('✅ Zadanie utworzone!')
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Nie udało się utworzyć zadania')
    }
  }
  
  const handleComplete = async (taskId: string) => {
    try {
      const res = await fetch('/api/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON. stringify({ id: taskId, token })
      })
      
      if (!res.ok) throw new Error('Failed to complete task')
      
      setTasks(prev => prev.filter(t => t.id !== taskId))
      console.log('✅ Zadanie ukończone!')
    } catch (err) {
      console.error('Error completing task:', err)
      alert('Nie udało się ukończyć zadania')
    }
  }
  
  const handleDelete = async (taskId: string) => {
    try {
      const res = await fetch('/api/todoist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON. stringify({ id: taskId, token })
      })
      
      if (!res.ok) throw new Error('Failed to delete task')
      
      setTasks(prev => prev.filter(t => t.id !== taskId))
      console.log('🗑️ Zadanie usunięte!')
    } catch (err) {
      console.error('Error deleting task:', err)
      alert('Nie udało się usunąć zadania')
    }
  }
  
  const handleUpdate = async (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ))
  }
  
  const filteredTasks = filterTasks(tasks)
  
  if (! token) {
    const handleOAuthConnect = () => {
      const clientId = process.env.NEXT_PUBLIC_TODOIST_CLIENT_ID
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectUri = `${baseUrl}/api/todoist/callback`
      const authUrl = `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=data:read_write&state=mvp-chatv2`
      
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Zarządzanie Zadaniami</h1>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{tasks.length} zadań</Badge>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="gap-2"
          >
            <Plus size={20} />
            Dodaj zadanie
          </Button>
        </div>
      </div>
      
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="today">Dziś</TabsTrigger>
          <TabsTrigger value="tomorrow">Jutro</TabsTrigger>
          <TabsTrigger value="week">Tydzień</TabsTrigger>
          <TabsTrigger value="month">Miesiąc</TabsTrigger>
          <TabsTrigger value="overdue">Przeterminowane</TabsTrigger>
        </TabsList>
        
        <TabsContent value={filter} className="space-y-3 mt-6">
          {loading ? (
            <Card className="p-8 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600">Ładowanie zadań...</span>
              </div>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600">Brak zadań dla tego filtra</p>
            </Card>
          ) : (
            filteredTasks.map(task => (
              <TaskCard 
                key={task. id} 
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onDetails={(task) => {
                  setSelectedTask(task)
                  setShowDetailsModal(true)
                }}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
      
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
      />
    </div>
  )
}

function TaskCard({ 
  task,
  onComplete,
  onDelete,
  onDetails
}: { 
  task: Task
  onComplete: (id: string) => void
  onDelete:  (id: string) => void
  onDetails: (task: Task) => void
}) {
  const priorityColors = {
    1: 'border-l-red-500 bg-red-50/50',
    2: 'border-l-orange-500 bg-orange-50/50',
    3: 'border-l-blue-500 bg-blue-50/50',
    4: 'border-l-gray-300 bg-white'
  }
  
  const priorityLabels = {
    1: 'P1',
    2: 'P2',
    3: 'P3',
    4: 'P4'
  }
  
  const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
  
  return (
    <Card className={cn(
      'p-4 border-l-4 transition-all hover:shadow-md',
      priorityColors[task.priority] || priorityColors[4]
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <h3 className="font-medium text-lg">{task.content}</h3>
          
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex gap-2 flex-wrap">
            {dueStr && (
              <Badge variant="outline" className="gap-1">
                <CalendarBlank size={14} />
                {format(parseISO(dueStr), 'dd MMM', { locale: pl })}
              </Badge>
            )}
            
            {task.priority && task.priority < 4 && (
              <Badge 
                variant={task.priority === 1 ? 'destructive' : 'secondary'}
                className="gap-1"
              >
                {priorityLabels[task.priority]}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onDetails(task)}
            title="Szczegóły"
          >
            <DotsThree size={18} weight="bold" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onComplete(task.id)}
            title="Ukończ"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <CheckCircle size={18} />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onDelete(task.id)}
            title="Usuń"
            className="text-red-600 hover: text-red-700 hover: bg-red-50"
          >
            <Trash size={18} />
          </Button>
        </div>
      </div>
    </Card>
  )
}
