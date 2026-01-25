'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
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
  status?: 'todo' | 'in_progress' | 'done'
}

type BoardGrouping = 'day' | 'status' | 'priority' | 'project'

interface SevenDaysBoardViewProps {
  tasks: Task[]
  grouping: BoardGrouping
  projects?: { id: string; name: string }[]
  onMove: (taskId: string, newValue: string, grouping: BoardGrouping) => Promise<void>
  onComplete: (taskId: string) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForKey?: (key: string) => void
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
  grouping,
  projects,
  onMove,
  onComplete,
  onDelete,
  onDetails,
  onAddForKey
}:  SevenDaysBoardViewProps) {
  const [startDate, setStartDate] = useState(startOfDay(new Date()))
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0) // 0-100 for scrollbar
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Mouse drag scrolling state
  const [isMouseDragging, setIsMouseDragging] = useState(false)
  const [mouseStartX, setMouseStartX] = useState(0)
  const [scrollStartX, setScrollStartX] = useState(0)

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
  
    // Scroll to today's column (only for day grouping)
    if (grouping !== 'day') return
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const todayIndex = days.findIndex(d => d.id === format(today, 'yyyy-MM-dd'))
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

  const days: DayColumn[] = useMemo(() => 
    grouping === 'day'
      ? Array.from({ length: 7 }, (_, i) => {
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
      : []
  , [grouping, startDate, tasks])

  const statusColumns = grouping === 'status'
    ? [
        { id: 'todo', label: 'Do zrobienia' },
        { id: 'in_progress', label: 'W toku' },
        { id: 'done', label: 'Zrobione' }
      ].map(col => ({
        id: col.id,
        date: new Date(),
        dateStr: col.id,
        label: col.label,
        shortLabel: col.label,
        tasks: tasks.filter(t => (t.status || 'todo') === col.id)
      }))
    : []

  const priorityColumns = grouping === 'priority'
    ? [
        { id: '1', label: 'Wysoki (P1)', shortLabel: 'P1' },
        { id: '2', label: 'Średni (P2)', shortLabel: 'P2' },
        { id: '3', label: 'Niski (P3)', shortLabel: 'P3' },
        { id: '4', label: 'Bez priorytetu (P4)', shortLabel: 'P4' }
      ].map(col => ({
        id: col.id,
        date: new Date(),
        dateStr: col.id,
        label: col.label,
        shortLabel: col.shortLabel,
        tasks: tasks.filter(t => String(t.priority) === col.id)
      }))
    : []

  const projectColumns = grouping === 'project'
    ? [
        // First, add column for tasks without a project
        {
          id: 'none',
          date: new Date(),
          dateStr: 'none',
          label: 'Bez projektu',
          shortLabel: 'Bez projektu',
          tasks: tasks.filter(t => !t.project_id)
        },
        // Then add columns for each project
        ...(projects || []).map(p => ({
          id: p.id,
          date: new Date(),
          dateStr: p.id,
          label: p.name,
          shortLabel: p.name,
          tasks: tasks.filter(t => t.project_id === p.id)
        }))
      ]
    : []

  const columns: DayColumn[] =
    grouping === 'day'
      ? days
      : grouping === 'status'
        ? statusColumns
        : grouping === 'priority'
          ? priorityColumns
          : projectColumns

  // Date range label for header
  const dateRangeLabel = grouping === 'day'
    ? `${format(startDate, 'd MMM', { locale: pl })} - ${format(addDays(startDate, 6), 'd MMM yyyy', { locale: pl })}`
    : undefined
  
  const today = startOfDay(new Date())
  const isCurrentWeek = grouping === 'day' ? isSameWeek(startDate, today, { locale: pl }) : false

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
    
    // Auto-scroll threshold (100px from edge for more responsive scrolling)
    const scrollThreshold = 100
    const scrollSpeed = 20
    
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
    const newKey = over.id as string
    
    const targetColumn = columns.find(d => d.id === newKey)
    if (!targetColumn) return
    
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const currentKey =
      grouping === 'day'
        ? (task.due ? (typeof task.due === 'string' ? task.due : task.due.date) : '')
        : grouping === 'status'
          ? (task.status || 'todo')
          : grouping === 'priority'
            ? String(task.priority)
            : task.project_id || 'none'
    if (currentKey === newKey) return
    
    setMovingTaskId(taskId)
    
    try {
      await onMove(taskId, newKey, grouping)
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
  
  // Mouse drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!scrollContainerRef.current) return
    
    // Handle mouse button check (only for mouse events)
    if ('button' in e && e.button !== 0) return
    
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('select') || target.closest('input') || target.closest('[role="button"]')) return
    
    setIsMouseDragging(true)
    
    const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches[0].clientX
    setMouseStartX(clientX)
    setScrollStartX(scrollContainerRef.current.scrollLeft)
    
    // Prevent text selection during drag (only for mouse events)
    if ('preventDefault' in e && 'button' in e) {
      e.preventDefault()
    }
  }
  
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMouseDragging || !scrollContainerRef.current) return
    
    const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches[0].clientX
    const deltaX = clientX - mouseStartX
    const newScrollLeft = scrollStartX - deltaX
    scrollContainerRef.current.scrollLeft = newScrollLeft
    
    // Auto-scroll if near edge during mouse drag
    const rect = scrollContainerRef.current.getBoundingClientRect()
    const scrollThreshold = 80
    const scrollSpeed = 15
    
    if ('clientX' in e && e.clientX < rect.left + scrollThreshold && scrollContainerRef.current.scrollLeft > 0) {
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollContainerRef.current.scrollLeft - scrollSpeed)
    } else if ('clientX' in e && e.clientX > rect.right - scrollThreshold && scrollContainerRef.current.scrollLeft < scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth) {
      scrollContainerRef.current.scrollLeft = Math.min(
        scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth,
        scrollContainerRef.current.scrollLeft + scrollSpeed
      )
    }
  }
  
  const handleMouseUp = () => {
    setIsMouseDragging(false)
  }
  
  const handleMouseLeave = () => {
    setIsMouseDragging(false)
  }
  
  // Add global mouse up listener
  useEffect(() => {
    if (isMouseDragging) {
      const handleGlobalMouseUp = () => setIsMouseDragging(false)
      window.addEventListener('mouseup', handleGlobalMouseUp)
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isMouseDragging])

  const scrollLeft = () => {
    if (scrollContainerRef.current && columns.length > 0) {
      const columnWidth = scrollContainerRef.current.scrollWidth / columns.length
      scrollContainerRef.current.scrollBy({ left: -columnWidth, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current && columns.length > 0) {
      const columnWidth = scrollContainerRef.current.scrollWidth / columns.length
      scrollContainerRef.current.scrollBy({ left: columnWidth, behavior: 'smooth' })
    }
  }

  // Mobile-friendly snapping with fewer columns visible and momentum scroll support

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      setScrollPosition(container.scrollLeft)
      // Calculate progress: (current / max) * 100
      const maxScroll = container.scrollWidth - container.clientWidth
      const progress = maxScroll > 0 ? (container.scrollLeft / maxScroll) * 100 : 0
      setScrollProgress(progress)
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
  
  // Check if today is visible in viewport
  const [isTodayVisible, setIsTodayVisible] = useState(true)
  
  useEffect(() => {
    if (!scrollContainerRef.current || grouping !== 'day') return
    
    const checkTodayVisibility = () => {
      if (!scrollContainerRef.current) return
      
      const todayIndex = days.findIndex(d => isSameDay(d.date, new Date()))
      if (todayIndex < 0) {
        setIsTodayVisible(false)
        return
      }
      
      const container = scrollContainerRef.current
      const columnWidth = container.scrollWidth / days.length
      const todayLeft = columnWidth * todayIndex
      const todayRight = todayLeft + columnWidth
      
      const viewportLeft = container.scrollLeft
      const viewportRight = viewportLeft + container.clientWidth
      
      // Today is visible if any part of it is in the viewport
      const visible = todayRight > viewportLeft && todayLeft < viewportRight
      setIsTodayVisible(visible)
    }
    
    checkTodayVisibility()
  }, [scrollPosition, days, grouping])

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Header with date range and navigation */}
      {grouping === 'day' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 px-2 sticky top-0 bg-white z-10 pb-2">
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
          
          {/* Show "Dzisiaj" button when today is not visible or not in current week */}
          {(!isTodayVisible || !isCurrentWeek) && (
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
      )}

      {/* Carousel container with navigation arrows */}
      <div className="relative pb-4 sm:pb-4 md:pb-6 lg:pb-8 w-full overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Navigation arrows - positioned absolutely above the container */}
        <div className="absolute -top-12 sm:-top-14 left-0 right-0 flex items-center justify-between pointer-events-none px-1 sm:px-0 z-20">
          {/* Left scroll arrow */}
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={cn(
              'pointer-events-auto flex w-8 h-8 sm:w-10 sm:h-10 items-center justify-center bg-white/95 backdrop-blur-sm rounded-full shadow-lg border-2 border-gray-200 transition-all hover:shadow-xl hover:scale-110',
              !canScrollLeft && 'opacity-0 pointer-events-none'
            )}
            aria-label="Scroll left"
          >
            <CaretLeft size={16} weight="bold" className="text-gray-700 sm:size-5" />
          </button>

          {/* Right scroll arrow */}
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className={cn(
              'pointer-events-auto flex w-8 h-8 sm:w-10 sm:h-10 items-center justify-center bg-white/95 backdrop-blur-sm rounded-full shadow-lg border-2 border-gray-200 transition-all hover:shadow-xl hover:scale-110',
              !canScrollRight && 'opacity-0 pointer-events-none'
            )}
            aria-label="Scroll right"
          >
            <CaretRight size={16} weight="bold" className="text-gray-700 sm:size-5" />
          </button>
        </div>

        {/* Custom scrollbar indicator - positioned above cards, below date range */}
        <div className="relative w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-brand-purple to-brand-pink rounded-full transition-all duration-75"
            style={{
              width: `${Math.max(20, ((scrollContainerRef.current?.clientWidth || 0) / (scrollContainerRef.current?.scrollWidth || 1)) * 100)}%`,
              marginLeft: `${scrollProgress}%`,
              transform: 'translateX(-100%)'
            }}
          />
        </div>

        {/* Scrollable carousel container - single row on all devices */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className={cn(
            "overflow-x-auto snap-x snap-mandatory w-full h-[calc(100vh-240px)] sm:h-[calc(100vh-220px)] md:h-[calc(100vh-200px)] lg:h-[calc(100vh-180px)]",
            "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gradient-to-r [&::-webkit-scrollbar-thumb]:from-brand-purple [&::-webkit-scrollbar-thumb]:to-brand-pink [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gradient-to-r hover:[&::-webkit-scrollbar-thumb]:from-brand-purple hover:[&::-webkit-scrollbar-thumb]:to-brand-pink",
            isMouseDragging && "cursor-grabbing select-none"
          )}
          style={{ 
            scrollBehavior: isMouseDragging ? 'auto' : 'smooth',
            cursor: isMouseDragging ? 'grabbing' : 'grab',
            WebkitOverflowScrolling: 'touch',
            WebkitTouchCallout: 'none'
          }}
        >
          {/* Single row flex layout for carousel behavior */}
          <div className="flex gap-3 w-max px-1 sm:px-2 pb-1">
            {columns.map(day => (
              <div 
                key={day.id} 
                className="w-[calc(100vw-32px)] sm:w-[calc(66vw-24px)] md:w-[calc(33.33vw-16px)] lg:w-[280px] xl:w-[340px] 2xl:w-[380px] flex-shrink-0 snap-start"
              >
                <DayColumnComponent
                  day={day}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onDetails={onDetails}
                  onAddForKey={onAddForKey}
                  movingTaskId={movingTaskId}
                  isDraggingGlobal={isDragging}
                  grouping={grouping}
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
              <MiniTaskCard task={activeTask} grouping={grouping} />
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
  onAddForKey,
  movingTaskId,
  isDraggingGlobal,
  grouping
}: {
  day: DayColumn
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForKey?: (key: string) => void
  movingTaskId: string | null
  isDraggingGlobal: boolean
  grouping: BoardGrouping
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
            <span className="hidden sm:inline">{day.label}</span>
            <span className="sm:hidden">{day.shortLabel}</span>
          </h3>
          {grouping === 'day' && (
            <p className="text-xs text-gray-500 truncate">
              {format(day.date, 'd MMM', { locale: pl })}
            </p>
          )}
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
        <div className="p-1.5 space-y-1 min-h-[120px] max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-260px)] overflow-y-auto">
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
                grouping={grouping}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Add Task Button */}
      {onAddForKey && (
        <div className="p-2 border-t bg-gray-50/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddForKey(day.id)}
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
  isDraggingGlobal,
  grouping
}: {
  task: Task
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  isMoving: boolean
  isDraggingGlobal: boolean
  grouping: BoardGrouping
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
        grouping={grouping}
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
  isDraggingGlobal,
  grouping
}: {
  task: Task
  onComplete?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onDetails?: (task: Task) => void
  dragHandleProps?: any
  isDraggingGlobal?: boolean
  grouping?: BoardGrouping
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
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs line-clamp-1 group-hover:text-brand-purple transition-colors">
              {task.content}
            </p>
            
            {/* Show due date when grouping is not by day */}
            {grouping !== 'day' && task.due && (() => {
              try {
                const dueStr = typeof task.due === 'string' ? task.due : task.due.date
                return (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500">
                    <CalendarBlank size={10} weight="bold" />
                    <span>
                      {format(parseISO(dueStr), 'd MMM', { locale: pl })}
                    </span>
                  </div>
                )
              } catch {
                return null
              }
            })()}
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
