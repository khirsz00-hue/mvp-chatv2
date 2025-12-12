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
  id:  string
  content: string
  description?:  string
  project_id?:  string
  priority:  1 | 2 | 3 | 4
  due?:  { date: string } | string
  completed?: boolean
  created_at?:  string
}

interface SevenDaysBoardViewProps {
  tasks: Task[]
  onMove: (taskId: string, newDate: string) => Promise<void>
  onComplete: (taskId: string) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForDate?:  (date: string) => void
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
    const currentDueStr = task?.due ?  (typeof task.due === 'string' ? task.due : task. due.date) : null
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
      <div className="flex gap-4 overflow-x-auto pb-4">
        {days. map(day => (
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
        {activeTask ?  (
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
        'flex-shrink-0 w-80 bg-white rounded-xl border-2 shadow-sm transition-all',
        isOver ?  'border-brand-purple bg-brand-purple/5 shadow-lg' : 'border-gray-200',
        isToday && 'border-brand-pink shadow-md'
      )}
    >
      {/* Header */}
      <div className={cn(
        'p-4 border-b flex items-center justify-between',
        isToday && 'bg-gradient-to-r from-brand-purple/10 to-brand-pink/10'
      )}>
        <div>
          <h3 className={cn(
            'font-semibold text-lg',
            isToday && 'text-brand-purple'
          )}>
            {day.label}
          </h3>
          <p className="text-sm text-gray-500">
            {format(day.date, 'd MMMM', { locale: pl })}
          </p>
        </div>
        
        <Badge variant={isToday ? 'default' : 'secondary'} className="ml-2">
          {day.tasks.length}
        </Badge>
      </div>

      {/* Tasks */}
      <SortableContext
        items={day.tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-3 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
          {day.tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CalendarBlank size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Brak zadań</p>
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
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddForDate(day.dateStr)}
            className="w-full gap-2 text-gray-500 hover:text-brand-purple"
          >
            <Plus size={18} />
            Dodaj zadanie
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'touch-none',
        isMoving && 'pointer-events-none'
      )}
    >
      <MiniTaskCard
        task={task}
        onComplete={onComplete}
        onDelete={onDelete}
        onDetails={onDetails}
      />
    </div>
  )
}

// Mini Task Card
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
    if (! onComplete) return

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
    if (! confirm('Usunąć zadanie?')) return

    setLoading(true)
    try {
      await onDelete(task.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      className={cn(
        'p-3 border-l-4 transition-all hover:shadow-md group cursor-pointer',
        priorityColors[task.priority] || priorityColors[4],
        loading && 'opacity-50'
      )}
      onClick={() => onDetails?.(task)}
    >
      <div className="space-y-2">
        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-brand-purple transition-colors">
          {task. content}
        </h4>

        {task.description && (
          <p className="text-xs text-gray-500 line-clamp-1">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          {task.priority < 4 && (
            <Badge variant={task.priority === 1 ? 'destructive' : 'secondary'} className="text-xs">
              {priorityLabels[task. priority]}
            </Badge>
          )}

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onComplete && (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="p-1 hover:bg-green-100 rounded text-green-600"
                title="Ukończ"
              >
                <CheckCircle size={16} weight="bold" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="p-1 hover:bg-red-100 rounded text-red-600"
                title="Usuń"
              >
                <Trash size={16} weight="bold" />
              </button>
            )}
            {onDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDetails(task)
                }}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Szczegóły"
              >
                <DotsThree size={16} weight="bold" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
