'use client'

import { useState, useRef, useEffect } from 'react'
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent, useDroppable, DragMoveEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { CalendarBlank, CheckCircle, Trash, Plus, CaretLeft, CaretRight, DotsThree, Brain, ChatCircle, Timer, DotsNine } from '@phosphor-icons/react'
import { format, addDays, parseISO, startOfDay, isSameDay, isSameWeek } from 'date-fns'
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
  const [startDate, setStartDate] = useState(startOfDay(new Date()))
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Constants
  const DRAG_THRESHOLD = 5 // pixels of movement before considering it a drag

  // Navigation functions
  const goToPreviousWeek = () => {
    setStartDate(prev => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setStartDate(prev => addDays(prev, 7))
  }

  const goToToday = () => {
    const today = startOfDay(new Date())
    setStartDate(today)
    
    // Scroll to today's column
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const todayIndex = days.findIndex(d => isSameDay(d.date, today))
        if (todayIndex >= 0) {
          const columnWidth = scrollContainerRef.current.scrollWidth / days.length
          scrollContainerRef.current.scrollTo({ 
            left: columnWidth * todayIndex, 
            behavior: 'smooth' 
          })
        }
      }
    }, 100)
  }

  // Generate 7 days columns from startDate
  const days: DayColumn[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i)
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

  // Date range label for header
  const dateRangeLabel = `${format(startDate, 'd MMM', { locale: pl })} - ${format(addDays(startDate, 6), 'd MMM yyyy', { locale: pl })}`
  
  // Check if current view contains today
  const today = startOfDay(new Date())
  const isCurrentWeek = isSameWeek(startDate, today, { locale: pl })

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setActiveTask(task)
    }
    
    // Track drag start position
    const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent
    if (activatorEvent) {
      const clientX = 'clientX' in activatorEvent ? activatorEvent.clientX : activatorEvent.touches?.[0]?.clientX ?? 0
      const clientY = 'clientY' in activatorEvent ? activatorEvent.clientY : activatorEvent.touches?.[0]?.clientY ?? 0
      setDragStartPos({ x: clientX, y: clientY })
      setIsDragging(false)
    }
  }

  const handleDragMove = (event: DragMoveEvent) => {
    if (!scrollContainerRef.current || !activeTask) return
    
    // Detect if user actually dragged (moved more than threshold)
    if (dragStartPos && !isDragging) {
      const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent
      const clientX = 'clientX' in activatorEvent ? activatorEvent.clientX : activatorEvent.touches?.[0]?.clientX ?? 0
      const clientY = 'clientY' in activatorEvent ? activatorEvent.clientY : activatorEvent.touches?.[0]?.clientY ?? 0
      const distance = Math.sqrt(
        Math.pow(clientX - dragStartPos.x, 2) + Math.pow(clientY - dragStartPos.y, 2)
      )
      if (distance > DRAG_THRESHOLD) {
        setIsDragging(true)
      }
    }
    
    const container = scrollContainerRef.current
    const rect = container.getBoundingClientRect()
    
    // Get client position from either MouseEvent or TouchEvent
    let clientX = 0
    const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent
    if ('clientX' in activatorEvent && typeof activatorEvent.clientX === 'number') {
      clientX = activatorEvent.clientX
    } else if ('touches' in activatorEvent && activatorEvent.touches && activatorEvent.touches.length > 0) {
      const touch = activatorEvent.touches[0]
      if (touch && typeof touch.clientX === 'number') {
        clientX = touch.clientX
      }
    }
    
    const x = event.delta.x + clientX
    
    // Auto-scroll threshold (50px from edge)
    const scrollThreshold = 50
    const scrollSpeed = 10
    
    // Clear existing interval
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current)
      autoScrollIntervalRef.current = null
    }
    
    // Check if near left edge
    if (x < rect.left + scrollThreshold && container.scrollLeft > 0) {
      autoScrollIntervalRef.current = setInterval(() => {
        if (container.scrollLeft > 0) {
          container.scrollLeft -= scrollSpeed
        } else if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current)
          autoScrollIntervalRef.current = null
        }
      }, 16)
    }
    // Check if near right edge
    else if (x > rect.right - scrollThreshold && container.scrollLeft < container.scrollWidth - container.clientWidth) {
      autoScrollIntervalRef.current = setInterval(() => {
        if (container.scrollLeft < container.scrollWidth - container.clientWidth) {
          container.scrollLeft += scrollSpeed
        } else if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current)
          autoScrollIntervalRef.current = null
        }
      }, 16)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    // Clear auto-scroll interval
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current)
      autoScrollIntervalRef.current = null
    }
    
    setActiveTask(null)
    setDragStartPos(null)
    setIsDragging(false)
    
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

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
      }
    }
  }, [])

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const columnWidth = scrollContainerRef.current.scrollWidth / days.length
      scrollContainerRef.current.scrollBy({ left: -columnWidth, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const columnWidth = scrollContainerRef.current.scrollWidth / days.length
      scrollContainerRef.current.scrollBy({ left: columnWidth, behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft)
    }
  }

  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      setCanScrollRight(scrollPosition < container.scrollWidth - container.clientWidth)
    }
  }, [scrollPosition])

  const canScrollLeft = scrollPosition > 0

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Header with date range and navigation */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={goToPreviousWeek}
            className="gap-1"
          >
            <CaretLeft size={16} weight="bold" />
          </Button>
          
          <h3 className="text-lg font-bold text-gray-800 min-w-[200px] text-center">
            {dateRangeLabel}
          </h3>
          
          <Button
            size="sm"
            variant="outline"
            onClick={goToNextWeek}
            className="gap-1"
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
        
        {!isCurrentWeek && (
          <Button
            size="sm"
            variant="default"
            onClick={goToToday}
            className="gap-1.5 bg-gradient-to-r from-brand-purple to-brand-pink hover:opacity-90 text-white font-semibold"
          >
            <CalendarBlank size={16} weight="bold" />
            Dzisiaj
          </Button>
        )}
      </div>

      {/* Carousel container with navigation arrows */}
      <div className="relative pb-4 w-full overflow-x-hidden">
        {/* Left scroll arrow - visible on all devices */}
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={cn(
            'flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white rounded-full shadow-lg border-2 border-gray-200 transition-all hover:shadow-xl hover:scale-110',
            !canScrollLeft && 'opacity-0 pointer-events-none'
          )}
          aria-label="Scroll left"
        >
          <CaretLeft size={24} weight="bold" className="text-gray-700" />
        </button>

        {/* Right scroll arrow - visible on all devices */}
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={cn(
            'flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white rounded-full shadow-lg border-2 border-gray-200 transition-all hover:shadow-xl hover:scale-110',
            !canScrollRight && 'opacity-0 pointer-events-none'
          )}
          aria-label="Scroll right"
        >
          <CaretRight size={24} weight="bold" className="text-gray-700" />
        </button>

        {/* Scrollable carousel container - single row on all devices */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-x-auto scrollbar-hide snap-x snap-mandatory w-full"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Single row flex layout for carousel behavior */}
          <div className="flex gap-3 w-max">
            {days.map(day => (
              <div key={day.id} className="w-64 sm:w-72 md:w-80 flex-shrink-0 snap-start">
                <DayColumnComponent
                  day={day}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onDetails={onDetails}
                  onAddForDate={onAddForDate}
                  movingTaskId={movingTaskId}
                  isDraggingGlobal={isDragging}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-64">
            <div className="vibrate-drag shadow-2xl opacity-90">
              <MiniTaskCard task={activeTask} />
            </div>
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
  movingTaskId,
  isDraggingGlobal
}: {
  day: DayColumn
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForDate?: (date: string) => void
  movingTaskId: string | null
  isDraggingGlobal: boolean
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
        <div className="p-1.5 space-y-1 min-h-[150px] max-h-[calc(100vh-280px)] overflow-y-auto">
          {day.tasks.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <CalendarBlank size={24} className="mx-auto mb-1 opacity-40" />
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
                isDraggingGlobal={isDraggingGlobal}
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
  isMoving,
  isDraggingGlobal
}: {
  task: Task
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  isMoving: boolean
  isDraggingGlobal: boolean
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

  // Wrapper receives sortable ref and styles, but card handles click/drag separately
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all',
        isDragging && 'opacity-0',
        isMoving && 'pointer-events-none scale-95 opacity-70'
      )}
    >
      <MiniTaskCard
        task={task}
        onComplete={onComplete}
        onDelete={onDelete}
        onDetails={onDetails}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDraggingGlobal={isDraggingGlobal}
      />
    </div>
  )
}

// Mini Task Card - Ultra Compact Design
function MiniTaskCard({
  task,
  onComplete,
  onDelete,
  onDetails,
  dragHandleProps,
  isDraggingGlobal
}: {
  task: Task
  onComplete?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onDetails?: (task: Task) => void
  dragHandleProps?: any
  isDraggingGlobal?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

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

  const handleClick = (e: React.MouseEvent) => {
    // Trigger details when card is clicked
    if (onDetails) {
      onDetails(task)
    }
  }

  return (
    <div className="relative">
      {/* Using div instead of Card component for ultra-compact design with minimal padding */}
      <div
        className={cn(
          'px-2 py-1.5 border-l-2 rounded-md transition-all hover:shadow-sm group text-xs cursor-pointer',
          priorityColors[task.priority] || priorityColors[4],
          loading && 'opacity-50'
        )}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        role="button"
        tabIndex={0}
        aria-label={`Task: ${task.content}`}
      >
        <div className="flex items-center gap-1.5">
          {/* Drag handle - only this part is draggable */}
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
              title="Przeciągnij aby przenieść"
            >
              <DotsNine size={14} weight="bold" className="text-gray-400" />
            </button>
          )}
          
          {/* Priority indicator dot */}
          <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', priorityDots[task.priority])} />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs line-clamp-1 group-hover:text-brand-purple transition-colors">
              {task.content}
            </p>
          </div>
          
          {/* Context menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              const rect = e.currentTarget.getBoundingClientRect()
              setMenuPosition({ 
                x: Math.min(rect.left, window.innerWidth - 200), 
                y: rect.bottom + 5 
              })
              setShowContextMenu(true)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
            title="Więcej opcji"
          >
            <DotsThree size={14} weight="bold" className="text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Enhanced tooltip on hover */}
      {showTooltip && task.description && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none">
          <div className="font-semibold mb-1">{task.content}</div>
          <div className="text-gray-300 line-clamp-3">{task.description}</div>
        </div>
      )}
      
      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[199]" 
            onClick={(e) => {
              e.stopPropagation()
              setShowContextMenu(false)
            }}
          />
          <div 
            className="fixed z-[200] bg-white rounded-lg shadow-xl border border-gray-200 p-2 space-y-1 min-w-[160px]"
            style={{ left: menuPosition.x, top: menuPosition.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDetails?.(task)
                setShowContextMenu(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded hover:bg-gray-100 transition-colors text-gray-700"
            >
              <Brain size={14} weight="bold" />
              <span>Doprecyzuj</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleComplete(e)
                setShowContextMenu(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded hover:bg-gray-100 transition-colors text-green-600"
            >
              <CheckCircle size={14} weight="bold" />
              <span>Ukończ</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(e)
                setShowContextMenu(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded hover:bg-gray-100 transition-colors text-red-600"
            >
              <Trash size={14} weight="bold" />
              <span>Usuń</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
