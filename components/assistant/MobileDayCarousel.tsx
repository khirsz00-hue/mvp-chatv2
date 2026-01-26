'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { CalendarBlank, CheckCircle, Trash, Plus, CaretLeft, CaretRight, DotsThree, Brain } from '@phosphor-icons/react'
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

interface MobileDayCarouselProps {
  tasks: Task[]
  onMove: (taskId: string, newDate: string) => Promise<void>
  onComplete: (taskId: string) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onDetails: (task: Task) => void
  onAddForKey?: (date: string) => void
}

export function MobileDayCarousel({
  tasks,
  onMove,
  onComplete,
  onDelete,
  onDetails,
  onAddForKey
}: MobileDayCarouselProps) {
  const [activeDay, setActiveDay] = useState(startOfDay(new Date()))
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragTargetDay, setDragTargetDay] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const edgeZoneTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get 3 days: yesterday, today, tomorrow
  const days = useMemo(() => {
    const yesterday = addDays(activeDay, -1)
    const today = activeDay
    const tomorrow = addDays(activeDay, 1)
    
    return [
      {
        date: yesterday,
        dateStr: format(yesterday, 'yyyy-MM-dd'),
        label: format(yesterday, 'EEEE', { locale: pl }),
        shortLabel: 'Wczoraj',
        tasks: tasks.filter(t => {
          const taskDue = typeof t.due === 'string' ? t.due : t.due?.date
          if (!taskDue) return false
          try {
            return isSameDay(startOfDay(parseISO(taskDue)), yesterday)
          } catch {
            return false
          }
        })
      },
      {
        date: today,
        dateStr: format(today, 'yyyy-MM-dd'),
        label: format(today, 'EEEE', { locale: pl }),
        shortLabel: 'Dziś',
        tasks: tasks.filter(t => {
          const taskDue = typeof t.due === 'string' ? t.due : t.due?.date
          if (!taskDue) return false
          try {
            return isSameDay(startOfDay(parseISO(taskDue)), today)
          } catch {
            return false
          }
        })
      },
      {
        date: tomorrow,
        dateStr: format(tomorrow, 'yyyy-MM-dd'),
        label: format(tomorrow, 'EEEE', { locale: pl }),
        shortLabel: 'Jutro',
        tasks: tasks.filter(t => {
          const taskDue = typeof t.due === 'string' ? t.due : t.due?.date
          if (!taskDue) return false
          try {
            return isSameDay(startOfDay(parseISO(taskDue)), tomorrow)
          } catch {
            return false
          }
        })
      }
    ]
  }, [activeDay, tasks])

  const previousDay = () => {
    setActiveDay(prev => addDays(prev, -1))
  }

  const nextDay = () => {
    setActiveDay(prev => addDays(prev, 1))
  }

  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="button"]')) return
    
    const taskCard = target.closest('[data-task-id]')
    if (!taskCard) return
    
    const taskId = taskCard.getAttribute('data-task-id')
    if (!taskId) return
    
    longPressTimeoutRef.current = setTimeout(() => {
      setDraggedTaskId(taskId)
    }, 200) // 200ms long press
  }

  const handleLongPressEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }
  }

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!draggedTaskId || !containerRef.current) return
    
    const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches?.[0]?.clientX
    if (!clientX) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const edgeZoneWidth = rect.width * 0.15 // 15% zones
    
    // Check if in edge zone
    const inLeftZone = clientX - rect.left < edgeZoneWidth
    const inRightZone = clientX - rect.left > rect.width - edgeZoneWidth
    
    if (inLeftZone || inRightZone) {
      // Start edge zone timeout
      if (!edgeZoneTimeoutRef.current) {
        edgeZoneTimeoutRef.current = setTimeout(() => {
          if (inLeftZone) {
            setActiveDay(prev => addDays(prev, -1))
          } else if (inRightZone) {
            setActiveDay(prev => addDays(prev, 1))
          }
          edgeZoneTimeoutRef.current = null
        }, 350) // 300-500ms range
      }
    } else {
      // Clear edge zone timeout if moved away from edge
      if (edgeZoneTimeoutRef.current) {
        clearTimeout(edgeZoneTimeoutRef.current)
        edgeZoneTimeoutRef.current = null
      }
    }
  }, [draggedTaskId])

  const handleDragEnd = useCallback(async (taskId: string) => {
    if (edgeZoneTimeoutRef.current) {
      clearTimeout(edgeZoneTimeoutRef.current)
      edgeZoneTimeoutRef.current = null
    }
    
    const task = tasks.find(t => t.id === taskId)
    if (!task) {
      setDraggedTaskId(null)
      return
    }
    
    const targetDateStr = format(activeDay, 'yyyy-MM-dd')
    const currentDateStr = typeof task.due === 'string' ? task.due : task.due?.date
    
    if (targetDateStr !== currentDateStr) {
      try {
        await onMove(taskId, targetDateStr)
      } catch (err) {
        console.error('Error moving task:', err)
      }
    }
    
    setDraggedTaskId(null)
  }, [tasks, activeDay, onMove])

  useEffect(() => {
    if (!draggedTaskId) return
    
    const handleMouseMove = (e: any) => handleDragMove(e)
    const handleTouchMove = (e: any) => handleDragMove(e)
    const handleMouseUp = () => handleDragEnd(draggedTaskId)
    const handleTouchEnd = () => handleDragEnd(draggedTaskId)
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [draggedTaskId, activeDay, handleDragEnd, handleDragMove])

  return (
    <DndContext
      collisionDetection={closestCenter}
    >
      {draggedTaskId && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-brand-purple text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-bounce">
          Kliknij w dzień aby przenieść zadanie
        </div>
      )}
      
      {/* Week mini cards navigation */}
      <div className="flex gap-1 p-2 bg-white border-b overflow-x-auto scrollbar-hide">
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(activeDay, i - 3) // Show 3 days before, current, 3 days after
          const isActive = isSameDay(day, activeDay)
          const dayTasks = tasks.filter(t => {
            const taskDue = typeof t.due === 'string' ? t.due : t.due?.date
            if (!taskDue) return false
            try {
              return isSameDay(startOfDay(parseISO(taskDue)), day)
            } catch {
              return false
            }
          })
          
          return (
            <button
              key={i}
              onClick={async () => {
                if (draggedTaskId) {
                  // If dragging, move task to this day
                  await onMove(draggedTaskId, format(day, 'yyyy-MM-dd'))
                  setDraggedTaskId(null)
                } else {
                  // Otherwise, navigate to this day
                  setActiveDay(day)
                }
              }}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                isActive 
                  ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md' 
                  : draggedTaskId
                    ? 'bg-brand-purple/10 text-brand-purple border-2 border-dashed border-brand-purple hover:bg-brand-purple/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <div className="text-center">
                <div className="font-bold">{format(day, 'd')}</div>
                <div className="text-[10px] opacity-75">{format(day, 'EEE', { locale: pl })}</div>
                {dayTasks.length > 0 && (
                  <div className={cn(
                    'text-[9px] mt-0.5 px-1.5 rounded-full',
                    isActive ? 'bg-white/30' : 'bg-brand-purple/20 text-brand-purple'
                  )}>
                    {dayTasks.length}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          onClick={previousDay}
          className="w-10 h-10 p-0"
        >
          <CaretLeft size={16} weight="bold" />
        </Button>
        
        <div className="text-center">
          <h3 className="font-bold text-lg">
            {format(activeDay, 'd MMMM yyyy', { locale: pl })}
          </h3>
          <p className="text-xs text-gray-500">
            {format(activeDay, 'EEEE', { locale: pl })}
          </p>
        </div>
        
        <Button
          size="sm"
          variant="outline"
          onClick={nextDay}
          className="w-10 h-10 p-0"
        >
          <CaretRight size={16} weight="bold" />
        </Button>
      </div>

      {/* Carousel - 3 columns: prev (20%), active (100%), next (20%) */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {days.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              'flex-shrink-0 snap-center px-2 pb-4',
              idx === 1 ? 'w-full' : 'w-[20%]'
            )}
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
          >
            <DayCard
              day={day}
              tasks={day.tasks}
              isDragging={draggedTaskId !== null}
              onComplete={onComplete}
              onDelete={onDelete}
              onDetails={onDetails}
              onMove={onMove}
              onAddForKey={onAddForKey}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {draggedTaskId ? (
          <div className="w-64 p-3 bg-white rounded-lg shadow-2xl border-2 border-brand-purple scale-105">
            {(() => {
              const task = tasks.find(t => t.id === draggedTaskId)
              return task ? (
                <div>
                  <p className="font-medium text-sm">{task.content}</p>
                  <p className="text-xs text-gray-500">Przeciągnij na krawędź aby zmienić dzień</p>
                </div>
              ) : null
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Day Card - shows tasks for a single day
function DayCard({
  day,
  tasks,
  isDragging,
  onComplete,
  onDelete,
  onDetails,
  onMove,
  onAddForKey
}: {
  day: any
  tasks: Task[]
  isDragging: boolean
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onMove: (taskId: string, newDate: string) => Promise<void>
  onAddForKey?: (date: string) => void
}) {
  const isToday = isSameDay(day.date, new Date())
  
  return (
    <div
      className={cn(
        'rounded-xl border-2 shadow-sm transition-all flex flex-col h-[calc(100dvh-180px)]',
        isToday ? 'border-brand-pink bg-brand-pink/5' : 'border-gray-200 bg-white'
      )}
    >
      {/* Header */}
      <div className={cn(
        'p-3 border-b flex items-center justify-between',
        isToday && 'bg-gradient-to-r from-brand-purple/10 to-brand-pink/10'
      )}>
        <div>
          <h3 className={cn(
            'font-bold text-base',
            isToday && 'text-brand-purple'
          )}>
            {day.shortLabel}
          </h3>
          <p className="text-xs text-gray-500">
            {format(day.date, 'd MMM', { locale: pl })}
          </p>
        </div>
        
        <Badge
          variant={isToday ? 'default' : 'secondary'}
          className={cn(
            'text-xs px-2 py-0.5',
            tasks.length > 5 && 'bg-orange-500 text-white'
          )}
        >
          {tasks.length}
        </Badge>
      </div>

      {/* Tasks list */}
      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <CalendarBlank size={24} className="mx-auto mb-1 opacity-40" />
              <p className="text-xs font-medium">Brak zadań</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCardMobile
                key={task.id}
                task={task}
                onComplete={onComplete}
                onDelete={onDelete}
                onDetails={onDetails}
                onMove={onMove}
                dayDateStr={day.dateStr}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Add button */}
      {onAddForKey && (
        <div className="p-2 border-t bg-gray-50/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddForKey(day.dateStr)}
            className="w-full gap-1 text-gray-600 hover:text-brand-purple text-xs py-1.5"
          >
            <Plus size={14} weight="bold" />
            Dodaj
          </Button>
        </div>
      )}
    </div>
  )
}

// Mobile task card - ultra compact
function TaskCardMobile({
  task,
  onComplete,
  onDelete,
  onDetails,
  onMove,
  dayDateStr
}: {
  task: Task
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onMove: (taskId: string, newDate: string) => Promise<void>
  dayDateStr: string
}) {
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showMoveSheet, setShowMoveSheet] = useState(false)
  
  const priorityColors = {
    1: 'border-l-red-500 bg-red-50/30',
    2: 'border-l-orange-500 bg-orange-50/30',
    3: 'border-l-blue-500 bg-blue-50/30',
    4: 'border-l-gray-300 bg-white'
  }

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      await onComplete(task.id)
    } finally {
      setLoading(false)
      setShowMenu(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Usunąć zadanie?')) return
    
    setLoading(true)
    try {
      await onDelete(task.id)
    } finally {
      setLoading(false)
      setShowMenu(false)
    }
  }

  return (
    <div data-task-id={task.id} className="relative">
      <div
        className={cn(
          'px-2 py-1.5 border-l-2 rounded-md transition-all text-xs cursor-pointer group',
          priorityColors[task.priority] || priorityColors[4],
          loading && 'opacity-50'
        )}
        onClick={() => onDetails(task)}
      >
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs line-clamp-1 group-hover:text-brand-purple">
              {task.content}
            </p>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
          >
            <DotsThree size={14} weight="bold" className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Context menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute z-50 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 space-y-1 min-w-[140px]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDetails(task)
                setShowMenu(false)
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-gray-100"
            >
              <Brain size={12} weight="bold" />
              Doprecyzuj
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMoveSheet(true)
                setShowMenu(false)
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-gray-100"
            >
              <CaretRight size={12} weight="bold" />
              Przenieś
            </button>
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-gray-100 text-green-600"
            >
              <CheckCircle size={12} weight="bold" />
              Ukończ
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-gray-100 text-red-600"
            >
              <Trash size={12} weight="bold" />
              Usuń
            </button>
          </div>
        </>
      )}

      {/* Move to day sheet */}
      {showMoveSheet && (
        <MoveToDaySheet
          taskId={task.id}
          onMove={onMove}
          onClose={() => setShowMoveSheet(false)}
        />
      )}
    </div>
  )
}

// Move to day bottom sheet
function MoveToDaySheet({
  taskId,
  onMove,
  onClose
}: {
  taskId: string
  onMove: (taskId: string, newDate: string) => Promise<void>
  onClose: () => void
}) {
  const today = startOfDay(new Date())
  const days = [
    { label: 'Wczoraj', date: addDays(today, -1) },
    { label: 'Dziś', date: today },
    { label: 'Jutro', date: addDays(today, 1) }
  ]

  const handleMove = async (dateStr: string) => {
    await onMove(taskId, dateStr)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-4 space-y-2 safe-area-bottom">
        <h3 className="font-bold text-sm mb-3">Przenieś do</h3>
        {days.map(d => (
          <button
            key={d.label}
            onClick={() => handleMove(format(d.date, 'yyyy-MM-dd'))}
            className="w-full p-3 rounded-lg border border-gray-200 hover:bg-brand-purple/10 transition-colors text-sm font-medium"
          >
            {d.label} – {format(d.date, 'd MMM', { locale: pl })}
          </button>
        ))}
      </div>
    </>
  )
}
export { MobileDayCarousel }