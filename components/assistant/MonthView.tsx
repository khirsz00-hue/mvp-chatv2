'use client'

import { useState } from 'react'
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { CalendarBlank, CheckCircle, Trash, Plus, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, parseISO, startOfDay, addMonths, subMonths } from 'date-fns'
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

interface MonthViewProps {
  tasks: Task[]
  onMove: (taskId: string, newDate: string) => Promise<void>
  onComplete: (taskId: string) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForDate?: (date: string) => void
}

export function MonthView({
  tasks,
  onMove,
  onComplete,
  onDelete,
  onDetails,
  onAddForDate
}: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { locale: pl })
  const endDate = endOfWeek(monthEnd, { locale: pl })

  // Generate calendar days
  const days: Date[] = []
  let day = startDate
  while (day <= endDate) {
    days.push(day)
    day = addDays(day, 1)
  }

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
    
    // Don't move if already in this date
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

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800">
              {format(currentMonth, 'LLLL yyyy', { locale: pl })}
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={goToToday}
              className="text-xs"
            >
              Dzisiaj
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={previousMonth}
              className="gap-1"
            >
              <CaretLeft size={16} weight="bold" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={nextMonth}
              className="gap-1"
            >
              <CaretRight size={16} weight="bold" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(startOfWeek(new Date(), { locale: pl }), i)
            return format(date, 'EEEEEE', { locale: pl })
          }).map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayTasks = tasks.filter(task => {
              const taskDueStr = typeof task.due === 'string' ? task.due : task.due?.date
              if (!taskDueStr) return false
              
              try {
                const taskDate = startOfDay(parseISO(taskDueStr))
                return isSameDay(taskDate, day)
              } catch {
                return false
              }
            })

            return (
              <DayCell
                key={dateStr}
                day={day}
                dateStr={dateStr}
                tasks={dayTasks}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isToday={isSameDay(day, new Date())}
                onComplete={onComplete}
                onDelete={onDelete}
                onDetails={onDetails}
                onAddForDate={onAddForDate}
                movingTaskId={movingTaskId}
              />
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-48">
            <div className="vibrate-drag shadow-2xl opacity-90">
              <MiniTaskCard task={activeTask} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Day Cell Component
function DayCell({
  day,
  dateStr,
  tasks,
  isCurrentMonth,
  isToday,
  onComplete,
  onDelete,
  onDetails,
  onAddForDate,
  movingTaskId
}: {
  day: Date
  dateStr: string
  tasks: Task[]
  isCurrentMonth: boolean
  isToday: boolean
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForDate?: (date: string) => void
  movingTaskId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[120px] border-2 rounded-lg p-2 transition-all',
        isOver ? 'border-brand-purple bg-brand-purple/5 shadow-lg' : 'border-gray-200',
        isToday && 'border-brand-pink bg-brand-pink/5',
        !isCurrentMonth && 'opacity-50 bg-gray-50'
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          'text-sm font-semibold',
          isToday ? 'text-brand-pink' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
        )}>
          {format(day, 'd')}
        </span>
        {tasks.length > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            {tasks.length}
          </Badge>
        )}
      </div>

      {/* Tasks */}
      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1 max-h-[80px] overflow-y-auto">
          {tasks.slice(0, 3).map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
              onDetails={onDetails}
              isMoving={movingTaskId === task.id}
            />
          ))}
          {tasks.length > 3 && (
            <div className="text-xs text-gray-500 text-center py-1">
              +{tasks.length - 3} więcej
            </div>
          )}
        </div>
      </SortableContext>
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
        'cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-0',
        isMoving && 'pointer-events-none scale-95 opacity-70'
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
  const priorityColors = {
    1: 'border-l-red-500 bg-red-50/30',
    2: 'border-l-orange-500 bg-orange-50/30',
    3: 'border-l-blue-500 bg-blue-50/30',
    4: 'border-l-gray-300 bg-white'
  }

  const priorityDots = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-blue-500',
    4: 'bg-gray-400'
  }

  return (
    <div
      className={cn(
        'px-2 py-1 border-l-2 rounded-md transition-all hover:shadow-sm group cursor-pointer text-xs',
        priorityColors[task.priority] || priorityColors[4]
      )}
      onClick={() => onDetails?.(task)}
    >
      <div className="flex items-center gap-1">
        <div className={cn('w-1 h-1 rounded-full flex-shrink-0', priorityDots[task.priority])} />
        <p className="font-medium text-xs line-clamp-1 group-hover:text-brand-purple transition-colors flex-1">
          {task.content}
        </p>
      </div>
    </div>
  )
}
