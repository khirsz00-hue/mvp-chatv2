'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CalendarBlank, Clock } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { format, isToday, isTomorrow, isWithinInterval, addDays, parseISO, isPast, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'

interface Task {
  id: string
  content: string
  description?: string
  project_id?: string
  priority: 1 | 2 | 3 | 4
  due?: { date: string } | string
  completed?: boolean
  created_at?: string
}

export function TasksAssistant() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('today')
  
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
      // Fetch all tasks by passing filter=all (API will return unfiltered tasks)
      const res = await fetch(`/api/todoist/tasks?token=${token}&filter=all`)
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
            return isWithinInterval(dueDate, { start: now, end: addDays(now, 30) })
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
  
  const filteredTasks = filterTasks(tasks)
  
  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Zarządzanie Zadaniami</h1>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Zaloguj się do Todoist aby zobaczyć zadania
          </p>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Zarządzanie Zadaniami</h1>
        <Badge variant="secondary">{tasks.length} zadań</Badge>
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
                <span className="text-muted-foreground">Ładowanie zadań...</span>
              </div>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Brak zadań dla tego filtra
              </p>
            </Card>
          ) : (
            filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// TaskCard - prosty komponent karty
function TaskCard({ task }: { task: Task }) {
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
            <p className="text-sm text-muted-foreground line-clamp-2">
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
      </div>
    </Card>
  )
}
