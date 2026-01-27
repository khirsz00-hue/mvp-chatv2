'use client'

import React, { useState, useRef, useMemo } from 'react'
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
  console.log('[MobileDayCarousel] RENDERING', { tasksCount: tasks.length })
  
  const [activeDay, setActiveDay] = useState(startOfDay(new Date()))
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragTargetDay, setDragTargetDay] = useState<string | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const miniCardsRef = useRef<HTMLDivElement>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const edgeZoneTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  
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
  
  // Scroll to today on mount
  React.useEffect(() => {
    if (miniCardsRef.current) {
      const todayIndex = 10 // Today is at index 10 (10 days before + today)
      const cardWidth = miniCardsRef.current.scrollWidth / 20
      miniCardsRef.current.scrollTo({
        left: cardWidth * todayIndex - miniCardsRef.current.clientWidth / 2 + cardWidth / 2,
        behavior: 'smooth'
      })
    }
  }, [])

  const previousDay = () => {
    setActiveDay(prev => addDays(prev, -1))
  }

  const nextDay = () => {
    setActiveDay(prev => addDays(prev, 1))
  }

  const handleLongPressStart = (taskId: string) => {
    longPressTimeoutRef.current = setTimeout(() => {
      setDraggedTaskId(taskId)
      console.log('[MobileDayCarousel] Long press activated for task:', taskId)
    }, 500) // 500ms long press
  }

  const handleLongPressEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
  }
  
  const handleSwipeStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  
  const handleSwipeEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current
    
    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - previous day
        setActiveDay(prev => addDays(prev, -1))
      } else {
        // Swipe left - next day
        setActiveDay(prev => addDays(prev, 1))
      }
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
    >
      {draggedTaskId && (
        <>
          <div 
            className="fixed inset-0 z-20 bg-black/20 pointer-events-none" 
          />
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-brand-purple text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
            <span>Kliknij w dzień aby przenieść zadanie</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDraggedTaskId(null)
              }}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Anuluj"
            >
              ✕
            </button>
          </div>
        </>
      )}
      
      {/* Week mini cards navigation */}
      <div className="relative z-30 select-none px-2 bg-white border-b" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
        {/* Left gradient overlay */}
        <div className="absolute left-2 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
        {/* Right gradient overlay */}
        <div className="absolute right-2 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
        
        <div 
          ref={miniCardsRef}
          data-scrollbar={isScrolling ? "visible" : "hidden"}
          className="snap-x snap-mandatory pt-2"
          onScroll={(e) => {
            // Show scrollbar when scrolling
            setIsScrolling(true)
            
            // Hide scrollbar after 1 second of no scrolling
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current)
            }
            scrollTimeoutRef.current = setTimeout(() => {
              setIsScrolling(false)
            }, 1000)
          }}
          style={{
            overflowX: 'scroll',
            scrollbarWidth: isScrolling ? 'thin' : 'none',
            scrollbarColor: '#a855f7 #f3f4f6',
            WebkitOverflowScrolling: 'touch',
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'calc((100% - 6 * 4px) / 7)',
            gap: '4px',
            paddingBottom: '8px'
          }}
        >
          {Array.from({ length: 20 }, (_, i) => {
          const day = addDays(new Date(), i - 10) // Show 10 days before today, today, 9 days after
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
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                const dayStr = format(day, 'yyyy-MM-dd')
                console.log('[MiniCard] Clicked:', { day: dayStr, draggedTaskId, isActive })
                
                if (draggedTaskId) {
                  // If dragging and clicking the same day (active), cancel drag
                  if (isActive) {
                    console.log('[MiniCard] Canceling drag')
                    setDraggedTaskId(null)
                    return
                  }
                  // Otherwise, move task to this day
                  console.log('[MiniCard] Moving task to:', dayStr)
                  try {
                    await onMove(draggedTaskId, dayStr)
                    console.log('[MiniCard] Move completed')
                    setDraggedTaskId(null)
                  } catch (err) {
                    console.error('[MiniCard] Move failed:', err)
                  }
                } else {
                  // Otherwise, navigate to this day
                  console.log('[MiniCard] Navigating to:', dayStr)
                  setActiveDay(day)
                }
              }}
              className={cn(
                'flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ease-out transform active:scale-95 snap-center border-2',
                isToday && !isActive
                  ? 'bg-violet-100 text-violet-700 border-violet-300' // Today but not active - subtle highlight
                  : isActive 
                    ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-md border-transparent' // Active (selected) - gradient
                    : draggedTaskId
                      ? 'bg-brand-purple/10 text-brand-purple border-dashed border-brand-purple hover:bg-brand-purple/20 hover:scale-105'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:scale-105'
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
        
        {/* Scroll hint - shows when not scrolling */}
        <div 
          className="flex items-center justify-center pb-2 transition-opacity duration-200"
          style={{
            opacity: isScrolling ? 0 : 1,
            pointerEvents: 'none'
          }}
        >
          <span className="text-[10px] text-gray-400 font-medium tracking-wide">← PRZESUŃ →</span>
        </div>
      </div>
      
      {/* Today button - always visible */}
      <div className="px-4 pt-2">
        <button
          onClick={() => {
            setActiveDay(startOfDay(new Date()))
            // Scroll to today card
            if (miniCardsRef.current) {
              const todayIndex = 10
              const cardWidth = miniCardsRef.current.scrollWidth / 20
              miniCardsRef.current.scrollTo({
                left: cardWidth * todayIndex - miniCardsRef.current.clientWidth / 2 + cardWidth / 2,
                behavior: 'smooth'
              })
            }
          }}
          className="w-full py-2 text-xs font-medium text-brand-purple bg-brand-purple/10 rounded-lg hover:bg-brand-purple/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <CalendarBlank size={14} weight="bold" />
          Dzisiaj
        </button>
      </div>
      
      {/* Simplified main view - show activeDay tasks */}
      <div
        ref={containerRef}
        className="px-4 pb-4"
      >
        <DayCard
          day={{
            date: activeDay,
            dateStr: format(activeDay, 'yyyy-MM-dd'),
            label: format(activeDay, 'EEEE', { locale: pl }),
            shortLabel: isSameDay(activeDay, new Date()) ? 'Dziś' : format(activeDay, 'd MMM', { locale: pl }),
            tasks: tasks.filter(t => {
              const taskDue = typeof t.due === 'string' ? t.due : t.due?.date
              if (!taskDue) return false
              try {
                return isSameDay(startOfDay(parseISO(taskDue)), activeDay)
              } catch {
                return false
              }
            })
          }}
          tasks={tasks.filter(t => {
            const taskDue = typeof t.due === 'string' ? t.due : t.due?.date
            if (!taskDue) return false
            try {
              return isSameDay(startOfDay(parseISO(taskDue)), activeDay)
            } catch {
              return false
            }
          })}
          draggedTaskId={draggedTaskId}
          onStartDrag={setDraggedTaskId}
          onComplete={onComplete}
          onDelete={onDelete}
          onDetails={onDetails}
          onMove={onMove}
          onAddForKey={onAddForKey}
          onSwipeStart={handleSwipeStart}
          onSwipeEnd={handleSwipeEnd}
        />
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
  draggedTaskId,
  onStartDrag,
  onComplete,
  onDelete,
  onDetails,
  onMove,
  onAddForKey,
  onSwipeStart,
  onSwipeEnd
}: {
  day: any
  tasks: Task[]
  draggedTaskId: string | null
  onStartDrag: (taskId: string) => void
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onMove: (taskId: string, newDate: string) => Promise<void>
  onAddForKey?: (date: string) => void
  onSwipeStart?: (e: React.TouchEvent) => void
  onSwipeEnd?: (e: React.TouchEvent) => void
}) {
  const isToday = isSameDay(day.date, new Date())
  
  return (
    <div
      className={cn(
        'rounded-xl border-2 shadow-sm transition-all flex flex-col select-none bg-white',
        isToday ? 'border-brand-purple/60' : 'border-gray-200'
      )}
      style={{ 
        height: 'calc(100dvh - 200px)',
        maxHeight: '600px',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
      onTouchStart={onSwipeStart}
      onTouchEnd={onSwipeEnd}
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
        <div className="p-2 space-y-1 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-brand-purple/40 scrollbar-track-transparent hover:scrollbar-thumb-brand-purple/60 transition-all">
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
                onStartDrag={onStartDrag}
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
  dayDateStr,
  onStartDrag
}: {
  task: Task
  onComplete: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onMove: (taskId: string, newDate: string) => Promise<void>
  dayDateStr: string
  onStartDrag: (taskId: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showMoveSheet, setShowMoveSheet] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  
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
          'px-3 py-2 border-l-3 rounded-md transition-all duration-200 ease-out text-sm cursor-pointer group bg-white shadow-sm hover:shadow-md select-none min-h-[52px]',
          task.priority === 1 && 'border-l-red-500',
          task.priority === 2 && 'border-l-orange-500',
          task.priority === 3 && 'border-l-blue-500',
          task.priority === 4 && 'border-l-gray-300',
          loading && 'opacity-50'
        )}
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
        onClick={(e) => {
          // Only trigger if not in drag mode
          if (!longPressTimerRef.current) {
            onDetails(task)
          }
        }}
        onTouchStart={(e) => {
          console.log('[TaskCard] Touch start:', task.id)
          longPressTimerRef.current = setTimeout(() => {
            console.log('[TaskCard] Long press activated:', task.id)
            onStartDrag(task.id)
          }, 500)
        }}
        onTouchEnd={() => {
          console.log('[TaskCard] Touch end, clearing timer')
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
          }
        }}
        onTouchMove={() => {
          if (longPressTimerRef.current) {
            console.log('[TaskCard] Touch move, clearing timer')
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
          }
        }}
      >
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs line-clamp-2 text-gray-800">
              {task.content}
            </p>
          </div>
          
          <button
            onClick={async (e) => {
              e.stopPropagation()
              setLoading(true)
              try {
                await onComplete(task.id)
              } finally {
                setLoading(false)
              }
            }}
            className="md:opacity-0 md:group-hover:opacity-100 transition-all p-1 hover:bg-green-50 rounded flex-shrink-0 text-green-600 hover:text-green-700"
            title="Ukończ zadanie"
          >
            <CheckCircle size={16} weight="bold" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded flex-shrink-0"
          >
            <DotsThree size={16} weight="bold" className="text-gray-600" />
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
          <div className="absolute z-[60] right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 space-y-1 min-w-[140px]">
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