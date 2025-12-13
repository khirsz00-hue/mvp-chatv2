'use client'

import { useState } from 'react'
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { CalendarBlank, CheckCircle, Trash, DotsThree, Plus } from '@phosphor-icons/react'
import { format, addDays, parseISO, startOfDay, isSameDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { cn } from '@/lib/utils'

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

interface SevenDaysBoardViewProps {
  tasks: Task[]
  onMove: (taskId: string, newDate: string) => Promise<void>
  onComplete: (taskId: string) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForDate?: (date: string) => void
}

interface DayColumn {
  id: string
  date: Date
  dateStr: string
  label: string
  shortLabel: string
  tasks: Task[]
}

export function SevenDaysBoardView({
  tasks,
  onMove,
  onComplete,
  onDelete,
  onDetails,
  onAddForDate
}:  SevenDaysBoardViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)

  // Generate 7 days columns
  const days: DayColumn[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfDay(new Date()), i)
    const dateStr = format(date, 'yyyy-MM-dd')
    
    return {
      id: dateStr,
      date,
      dateStr,
      label: format(date, 'EEEE', { locale: pl }),
      shortLabel: format(date, 'EEE', { locale: pl }),
      tasks: tasks.filter(task => {
        const taskDueStr = typeof task.due === 'string' ? task.due : task.due?.date
        if (!taskDueStr) return false
        
        try {
          const taskDate = startOfDay(parseISO(taskDueStr))
          return isSameDay(taskDate, date)
        } catch {
          return false
        }
      })
    }
  })

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveTask(null)
    
    if (!over) return
    
    const taskId = active.id as string
    const newDateStr = over.id as string
    
    // Check if dropped on a valid day column
    const targetDay = days.find(d => d.id === newDateStr)
    if (!targetDay) return
    
    // Don't move if already in this column
    const task = tasks.find(t => t.id === taskId)
    const currentDueStr = task?.due ? (typeof task.due === 'string' ? task.due : task.due.date) : null
    if (currentDueStr === newDateStr) return
    
    setMovingTaskId(taskId)
    
    try {
      await onMove(taskId, newDateStr)
    } catch (err) {
      console.error('Error moving task:', err)
    } finally {
      setMovingTaskId(null)
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Responsive grid layout - 7 columns fit on screen, vertical stack on small screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 pb-4">
        {days.map(day => (
          <DayColumnComponent
            key={day.id}
            day={day}
            onComplete={onComplete}
            onDelete={onDelete}
            onDetails={onDetails}
            onAddForDate={onAddForDate}
            movingTaskId={movingTaskId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-80">
            <MiniTaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Day Column Component
function DayColumnComponent({
  day,
  onComplete,
  onDelete,
  onDetails,
  onAddForDate,
  movingTaskId
}: {
  day: DayColumn
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForDate?: (date: string) => void
  movingTaskId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.id })
  
  const isToday = isSameDay(day.date, new Date())
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full bg-white rounded-xl border-2 shadow-sm transition-all flex flex-col',
        isOver ? 'border-brand-purple bg-brand-purple/5 shadow-lg' : 'border-gray-200',
        isToday && 'border-brand-pink shadow-md'
      )}
    >
      {/* Header */}
      <div className={cn(
        'p-3 border-b flex items-center justify-between',
        isToday && 'bg-gradient-to-r from-brand-purple/10 to-brand-pink/10'
      )}>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-bold text-base truncate',
            isToday && 'text-brand-purple'
          )}>
            {day.shortLabel}
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {format(day.date, 'd MMM', { locale: pl })}
          </p>
        </div>
        
        <Badge 
          variant={isToday ? 'default' : 'secondary'} 
          className={cn(
            'ml-2 text-xs px-2 py-0.5',
            day.tasks.length > 5 && 'bg-orange-500 text-white'
          )}
        >
          {day.tasks.length}
        </Badge>
      </div>

      {/* Tasks */}
      <SortableContext
        items={day.tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-1.5 min-h-[150px] max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {day.tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CalendarBlank size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">Brak zadań</p>
            </div>
          ) : (
            day.tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onComplete={onComplete}
                onDelete={onDelete}
                onDetails={onDetails}
                isMoving={movingTaskId === task.id}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Add Task Button */}
      {onAddForDate && (
        <div className="p-2 border-t bg-gray-50/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddForDate(day.dateStr)}
            className="w-full gap-1.5 text-gray-600 hover:text-brand-purple hover:bg-brand-purple/5 font-medium text-xs py-1.5"
          >
            <Plus size={16} weight="bold" />
            Dodaj
          </Button>
        </div>
      )}
    </div>
  )
}

// Sortable Task Card
function SortableTaskCard({
  task,
  onComplete,
  onDelete,
  onDetails,
  isMoving
}: {
  task: Task
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  isMoving: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isMoving ? 0.7 : 1
  }

  // Separate drag handle from clickable content
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isMoving && 'pointer-events-none'
      )}
    >
      <div className="flex items-stretch gap-1">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center cursor-grab active:cursor-grabbing px-1 hover:bg-gray-200 rounded transition-colors"
          title="Przeciągnij, aby przenieść"
        >
          <DotsThree size={16} className="text-gray-400" weight="bold" />
        </div>
        
        {/* Clickable task card */}
        <div className="flex-1">
          <MiniTaskCard
            task={task}
            onComplete={onComplete}
            onDelete={onDelete}
            onDetails={onDetails}
          />
        </div>
      </div>
    </div>
  )
}

// Mini Task Card - Compact Premium Design
function MiniTaskCard({
  task,
  onComplete,
  onDelete,
  onDetails
}: {
  task: Task
  onComplete?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onDetails?: (task: Task) => void
}) {
  const [loading, setLoading] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const priorityColors = {
    1: 'border-l-red-500 bg-gradient-to-r from-red-50/80 to-transparent',
    2: 'border-l-orange-500 bg-gradient-to-r from-orange-50/80 to-transparent',
    3: 'border-l-blue-500 bg-gradient-to-r from-blue-50/80 to-transparent',
    4: 'border-l-gray-300 bg-white'
  }

  const priorityDots = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-blue-500',
    4: 'bg-gray-400'
  }

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onComplete) return

    setLoading(true)
    try {
      await onComplete(task.id)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDelete) return
    if (!confirm('Usunąć zadanie?')) return

    setLoading(true)
    try {
      await onDelete(task.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <Card
        className={cn(
          'p-2.5 border-l-[3px] transition-all hover:shadow-md hover:scale-[1.02] group cursor-pointer',
          priorityColors[task.priority] || priorityColors[4],
          loading && 'opacity-50'
        )}
        onClick={() => onDetails?.(task)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-start gap-2">
          {/* Priority indicator dot */}
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', priorityDots[task.priority])} />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-xs line-clamp-2 group-hover:text-brand-purple transition-colors leading-tight">
              {task.content}
            </h4>
            
            {/* Quick actions - shown on hover */}
            <div className="flex gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onComplete && (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="p-1 hover:bg-green-100 rounded text-green-600 transition-colors"
                  title="Ukończ"
                >
                  <CheckCircle size={14} weight="bold" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                  title="Usuń"
                >
                  <Trash size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Enhanced tooltip on hover */}
      {showTooltip && task.description && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none">
          <div className="font-semibold mb-1">{task.content}</div>
          <div className="text-gray-300 line-clamp-3">{task.description}</div>
        </div>
      )}
    </div>
  )
}
