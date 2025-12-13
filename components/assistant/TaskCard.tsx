'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { CalendarBlank, CheckCircle, Trash, DotsThree, Circle, CheckSquare } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useTaskTimer } from './TaskTimer'

interface Subtask {
  id: string
  content: string
  completed: boolean
}

interface Task {
  id: string
  content: string
  description?:  string
  project_id?:  string
  priority:  1 | 2 | 3 | 4
  due?:  { date: string } | string
  completed?: boolean
  created_at?: string
  subtasks?: Subtask[]
}

interface TaskCardProps {
  task: Task
  onComplete: (id: string) => Promise<void>
  onDelete:  (id: string) => Promise<void>
  onDetails: (task: Task) => void
  showCheckbox?: boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelection?: (taskId: string) => void
}

export function TaskCard({ 
  task, 
  onComplete, 
  onDelete, 
  onDetails,
  showCheckbox = true,
  selectable = false,
  selected = false,
  onToggleSelection
}: TaskCardProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasActiveTimer, setHasActiveTimer] = useState(false)
  
  const { getActiveTimer } = useTaskTimer()
  
  // Check if this task has an active timer
  useEffect(() => {
    const checkTimer = () => {
      const activeTimer = getActiveTimer()
      setHasActiveTimer(activeTimer.taskId === task.id && activeTimer.isActive)
    }
    
    checkTimer()
    
    // Listen for custom timer events (same tab) and storage events (other tabs)
    const handleTimerChange = () => checkTimer()
    window.addEventListener('timerStateChanged', handleTimerChange)
    window.addEventListener('storage', handleTimerChange)
    
    return () => {
      window.removeEventListener('timerStateChanged', handleTimerChange)
      window.removeEventListener('storage', handleTimerChange)
    }
  }, [task.id, getActiveTimer])
  
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
  
  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      await onComplete(task.id)
    } catch (err) {
      console.error('Error completing task:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (! confirm('Czy na pewno chcesz usunąć to zadanie?')) return
    
    setDeleting(true)
    try {
      await onDelete(task.id)
    } catch (err) {
      console.error('Error deleting task:', err)
      setDeleting(false)
    }
  }
  
  const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
  
  // Calculate subtasks progress
  const subtasksTotal = task.subtasks?.length || 0
  const subtasksCompleted = task.subtasks?. filter(s => s.completed).length || 0
  const subtasksProgress = subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0
  
  return (
    <Card 
      className={cn(
        'p-4 border-l-4 transition-all hover:shadow-lg group cursor-pointer',
        priorityColors[task.priority] || priorityColors[4],
        loading && 'opacity-50 pointer-events-none',
        deleting && 'opacity-0 scale-95',
        selected && 'ring-2 ring-brand-purple bg-brand-purple/5'
      )}
      onClick={() => onDetails(task)}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {selectable && onToggleSelection && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelection(task.id)
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 text-brand-purple border-gray-300 rounded focus:ring-brand-purple cursor-pointer flex-shrink-0"
          />
        )}
        
        {/* Quick complete checkbox */}
        {!selectable && showCheckbox && (
          <button 
            onClick={handleComplete}
            disabled={loading}
            className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
            title="Ukończ zadanie"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            ) : (
              <Circle 
                size={20} 
                weight="bold"
                className="text-gray-400 group-hover:text-green-600 transition-colors" 
              />
            )}
          </button>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg truncate group-hover:text-brand-purple transition-colors">
            {task.content}
          </h3>
          
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
          
          {/* Subtasks progress */}
          {subtasksTotal > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <CheckSquare size={14} />
                <span>{subtasksCompleted} / {subtasksTotal} ukończone</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1. 5">
                <div 
                  className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width:  `${subtasksProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Footer badges */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {hasActiveTimer && (
              <Badge className="gap-1 text-xs bg-red-500 text-white animate-pulse">
                <div className="w-2 h-2 rounded-full bg-white" />
                Live
              </Badge>
            )}
            
            {dueStr && (
              <Badge variant="outline" className="gap-1 text-xs">
                <CalendarBlank size={14} />
                {format(parseISO(dueStr), 'dd MMM', { locale: pl })}
              </Badge>
            )}
            
            {task.priority && task.priority < 4 && (
              <Badge 
                variant={task.priority === 1 ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {priorityLabels[task. priority]}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Actions (visible on hover) */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDetails(task)
            }}
            title="Szczegóły"
          >
            <DotsThree size={18} weight="bold" />
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleComplete}
            disabled={loading}
            title="Ukończ"
            className="text-green-600 hover:bg-green-50 hover:text-green-700"
          >
            <CheckCircle size={18} weight={loading ? 'regular' : 'bold'} />
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            title="Usuń"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash size={18} weight="bold" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
