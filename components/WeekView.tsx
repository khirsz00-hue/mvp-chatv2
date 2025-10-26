'use client'

import React, { useEffect, useRef, useState } from 'react'
import { format, addDays, startOfWeek, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import TaskCard from './TaskCard'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { appendHistory } from '../utils/localTaskStore'

interface WeekViewProps {
  tasks: any[]
  onComplete?: (id: string) => void
  onMove?: (id: string, newDateYmd: string) => void
  onDelete?: (id: string) => void
  onHelp?: (task: any) => void
  onOpenTask?: (task: any) => void
  onAddForDate?: (ymd: string) => void
}

export default function WeekView({
  tasks = [],
  onComplete,
  onMove,
  onDelete,
  onHelp,
  onOpenTask,
  onAddForDate,
}: WeekViewProps) {
  const today = startOfDay(new Date())
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  const [columns, setColumns] = useState<Record<string, any[]>>({})
  // Minimal additions for responsive carousel behavior:
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [visibleDays, setVisibleDays] = useState<number>(7)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const grouped: Record<string, any[]> = {}
    const keys = days.map((d) => format(d, 'yyyy-MM-dd'))
    keys.forEach((k) => (grouped[k] = []))

    tasks.forEach((t) => {
      const due = t._dueYmd ?? (t.due?.date ?? (typeof t.due === 'string' ? t.due : null))
      if (!due) {
        grouped[keys[0]].push(t)
        return
      }
      if (keys.includes(due)) grouped[due].push(t)
      else grouped[keys[0]].push(t)
    })
    setColumns(grouped)
  }, [tasks, days])

  const handleDragEnd = (result: any) => {
    setIsDragging(false)
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    // update local columns for immediate feedback
    const src = Array.from(columns[source.droppableId] || [])
    const [moved] = src.splice(source.index, 1)
    const dst = Array.from(columns[destination.droppableId] || [])
    dst.splice(destination.index, 0, moved)
    const newCols = { ...columns, [source.droppableId]: src, [destination.droppableId]: dst }
    setColumns(newCols)

    if (source.droppableId !== destination.droppableId) {
      onMove?.(draggableId, destination.droppableId)
      try {
        appendHistory(draggableId, source.droppableId, destination.droppableId)
      } catch {}
    }
  }

  // Responsive: compute visibleDays based on viewport width (minimal, safe logic)
  function calcVisibleDays(width: number) {
    if (width >= 1200) return 7
    if (width >= 1000) return 6
    if (width >= 800) return 5
    if (width >= 600) return 3
    return 1
  }

  useEffect(() => {
    function onResize() {
      setVisibleDays(calcVisibleDays(window.innerWidth))
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Prevent horizontal scroll during drag to avoid conflicts with DnD
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.style.overflowX = isDragging ? 'hidden' : 'auto'
  }, [isDragging])

  if (!columns || Object.values(columns).every((c) => c.length === 0)) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">Brak zadań w tym tygodniu.</div>
  }

  // Helper to scroll by one "page" (viewport width)
  const scrollNext = () => {
    const el = viewportRef.current
    if (!el) return
    el.scrollBy({ left: el.clientWidth, behavior: 'smooth' })
  }
  const scrollPrev = () => {
    const el = viewportRef.current
    if (!el) return
    el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 w-full">
      <div className="text-center py-3 border-b border-gray-200 bg-white mb-3">
        <h2 className="text-lg font-semibold text-gray-800">
          {format(weekStart, 'd MMM', { locale: pl })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
        </h2>
      </div>

      <DragDropContext onDragEnd={handleDragEnd} onDragStart={() => setIsDragging(true)}>
        <div className="relative">
          {/* Carousel controls */}
          <div className="absolute right-3 top-2 z-20 flex gap-2">
            <button
              aria-label="Poprzednie"
              onClick={scrollPrev}
              className="bg-white border rounded px-2 py-1 shadow-sm hover:bg-gray-50"
            >
              ‹
            </button>
            <button
              aria-label="Następne"
              onClick={scrollNext}
              className="bg-white border rounded px-2 py-1 shadow-sm hover:bg-gray-50"
            >
              ›
            </button>
          </div>

          {/* Horizontal scrollable viewport */}
          <div
            ref={viewportRef}
            className="flex gap-3 px-2 md:px-3 pb-6 flex-1 w-full min-h-[300px] overflow-x-auto snap-x snap-mandatory touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {days.map((date) => {
              const key = format(date, 'yyyy-MM-dd')
              const dayTasks = columns[key] || []
              const isToday = key === format(today, 'yyyy-MM-dd')
              return (
                <Droppable droppableId={key} key={key}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex: `0 0 ${100 / visibleDays}%`,
                        minWidth: `${100 / visibleDays}%`,
                      }}
                      className={`min-h-[200px] border rounded-md p-2 bg-white/90 flex flex-col transition-shadow duration-150 snap-start ${snapshot.isDraggingOver ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}
                    >
                      <div className={`mb-2 ${isToday ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>
                        <div className="flex items-center justify-between">
                          <div className="text-sm">{format(date, 'EEE d', { locale: pl })}</div>
                          <div>
                            <button onClick={(e) => { e.stopPropagation(); onAddForDate?.(key) }} title="Dodaj" className="p-1 rounded hover:bg-gray-100">
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto space-y-2">
                        <AnimatePresence>
                          {dayTasks.map((task: any, idx: number) => (
                            <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                              {(prov: any, snap: any) => {
                                const style = { ...prov.draggableProps.style, width: '100%' }
                                return (
                                  <motion.div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.12 }}
                                    style={style}
                                  >
                                    <div className={`p-2 rounded-lg shadow-sm border bg-white ${snap.isDragging ? 'z-50 scale-105' : ''}`}>
                                      <div className="flex items-start gap-3">
                                        <input type="checkbox" className="mt-2" onClick={(e) => { e.stopPropagation(); onComplete?.(task.id) }} />
                                        <div className="flex-1" onClick={() => onOpenTask?.(task)}>
                                          <TaskCard task={task} token={undefined} selectable={false} showContextMenu wrapTitle />
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )
                              }}
                            </Draggable>
                          ))}
                        </AnimatePresence>

                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}
