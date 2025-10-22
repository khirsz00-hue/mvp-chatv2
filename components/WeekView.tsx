'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
  format,
  addDays,
  startOfWeek,
  startOfDay,
  parseISO,
  isSameDay,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreVertical, CheckCircle2 } from 'lucide-react'

interface WeekViewProps {
  tasks: any[]
  onComplete?: (id: string) => void
  onMove?: (id: string, newDate: Date) => void
  onDelete?: (id: string) => void
  onHelp?: (task: any) => void
}

export default function WeekView({
  tasks = [],
  onComplete,
  onMove,
  onDelete,
  onHelp,
}: WeekViewProps) {
  const today = startOfDay(new Date())
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  const [columns, setColumns] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)
  const datePickers = useRef<Record<string, HTMLInputElement | null>>({})

  // Drag UX state
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragDestinationId, setDragDestinationId] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)

  // grupowanie po dniach (obsługa due: string lub due: {date})
  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setColumns({})
      return setLoading(true)
    }

    const grouped: Record<string, any[]> = {}
    for (const day of days) grouped[format(day, 'yyyy-MM-dd')] = []

    for (const t of tasks) {
      const dueStr = typeof t.due === 'string' ? t.due : t.due?.date ?? null
      if (!dueStr) continue

      let dateObj: Date
      try {
        dateObj = parseISO(dueStr)
        if (isNaN(dateObj.getTime())) dateObj = new Date(dueStr)
      } catch {
        dateObj = new Date(dueStr)
      }
      if (isNaN(dateObj.getTime())) continue

      const match = days.find((d) => isSameDay(d, dateObj))
      if (match) {
        const key = format(match, 'yyyy-MM-dd')
        grouped[key].push(t)
      }
    }

    setColumns(grouped)
    setLoading(false)
  }, [tasks])

  // DnD handlers (any dla zgodności TS w tej konfiguracji)
  const handleDragStart = (start: any) => {
    setDragSourceId(start.source.droppableId ?? null)
    setDraggingTaskId(start.draggableId ?? null)
    setDragDestinationId(null)
    if (typeof document !== 'undefined') document.body.classList.add('dragging-active')
  }

  const handleDragUpdate = (update: any) => {
    setDragDestinationId(update?.destination?.droppableId ?? null)
  }

  const handleDragEnd = (result: any) => {
    try {
      const { destination, source, draggableId } = result
      if (typeof document !== 'undefined') document.body.classList.remove('dragging-active')
      setDragSourceId(null)
      setDragDestinationId(null)
      setDraggingTaskId(null)

      if (!destination) return
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return

      const sourceTasks = Array.from(columns[source.droppableId] || [])
      const [moved] = sourceTasks.splice(source.index, 1)
      const destTasks = Array.from(columns[destination.droppableId] || [])
      destTasks.splice(destination.index, 0, moved)

      const newColumns = {
        ...columns,
        [source.droppableId]: sourceTasks,
        [destination.droppableId]: destTasks,
      }

      setColumns(newColumns)
      if (source.droppableId !== destination.droppableId) {
        const newDate = new Date(destination.droppableId)
        onMove?.(draggableId, newDate)
      }
    } catch (err) {
      if (typeof document !== 'undefined') document.body.classList.remove('dragging-active')
      setDragSourceId(null)
      setDragDestinationId(null)
      setDraggingTaskId(null)
      console.error('handleDragEnd error', err)
    }
  }

  const handleCompleteClick = (id: string) => {
    onComplete?.(id)
    setColumns((prev) => {
      const copy: Record<string, any[]> = {}
      for (const k of Object.keys(prev)) {
        copy[k] = prev[k].filter((t) => t.id !== id)
      }
      return copy
    })
  }

  const handleDeleteClick = (id: string) => {
    onDelete?.(id)
    setColumns((prev) => {
      const copy: Record<string, any[]> = {}
      for (const k of Object.keys(prev)) {
        copy[k] = prev[k].filter((t) => t.id !== id)
      }
      return copy
    })
  }

  const openDatePicker = (id: string) => {
    const el = datePickers.current[id]
    ;(el as any)?.showPicker?.() || el?.click?.()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
        ⏳ Wczytywanie zadań...
      </div>
    )
  }

  if (!columns || Object.values(columns).every((col) => col.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
        Brak zadań w tym tygodniu.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 w-full">
      <div className="text-center py-3 border-b border-gray-200 bg-white shadow-sm mb-3">
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
          {format(weekStart, 'd MMM', { locale: pl })} –{' '}
          {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
        </h2>
      </div>

      <DragDropContext
        onDragStart={handleDragStart}
        onDragUpdate={handleDragUpdate}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 px-2 md:px-3 pb-6 flex-1 overflow-x-auto w-full">
          {days.map((date) => {
            const key = format(date, 'yyyy-MM-dd')
            const dayTasks = columns[key] || []
            const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

            const isSource = dragSourceId === key
            const isTarget = dragDestinationId === key

            return (
              <Droppable droppableId={key} key={key}>
                {(provided: any, snapshot: any) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`week-column transition-all duration-150 ease-in-out ${
                      snapshot.isDraggingOver || isTarget
                        ? 'ring-2 ring-blue-300 bg-blue-50/30'
                        : isSource
                        ? 'ring-2 ring-green-200 bg-green-50/30'
                        : 'bg-white/80'
                    }`}
                    aria-label={`Dzień ${key}`}
                  >
                    <div className="week-column-header">
                      <div>
                        <div className={isToday ? 'week-day-today' : ''}>
                          {format(date, 'EEE d', { locale: pl })}
                        </div>
                      </div>
                    </div>

                    <div className="week-column-tasks">
                      {dayTasks.map((task: any, index: number) => (
                        <Draggable draggableId={String(task.id)} index={index} key={task.id}>
                          {(prov: any, snap: any) => {
                            const isDragging = snap.isDragging
                            const isBeingDragged = draggingTaskId === String(task.id) || isDragging

                            // ROOT elem receives draggable inline style (so it can follow cursor)
                            return (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={`task-card-outer mb-2`}
                                style={{ ...prov.draggableProps.style }}
                                data-task-id={task.id}
                              >
                                {/* Inner element receives visual effects (animation, scale) — does NOT override inline transform on root */}
                                <div
                                  className={`task-card-inner flex items-start gap-2 p-3 rounded-lg shadow-sm border border-gray-100 cursor-grab transition-all duration-150 ${
                                    isBeingDragged ? 'dragging-inner z-50' : 'bg-white'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start gap-2">
                                      <div>
                                        <div className="text-sm font-medium text-gray-800">
                                          {task.content}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {task.project_name || ''}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          title="Ukończ"
                                          onClick={() => handleCompleteClick(task.id)}
                                          className="p-1 rounded-full hover:bg-gray-100"
                                        >
                                          <CheckCircle2 size={18} className="text-green-600" />
                                        </button>

                                        <div className="relative">
                                          <button
                                            onClick={() =>
                                              setOpenMenuFor(openMenuFor === task.id ? null : task.id)
                                            }
                                            className="p-1 rounded hover:bg-gray-100"
                                            title="Więcej"
                                          >
                                            <MoreVertical size={16} />
                                          </button>

                                          <AnimatePresence>
                                            {openMenuFor === task.id && (
                                              <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                                              >
                                                <button
                                                  onClick={() => {
                                                    setOpenMenuFor(null)
                                                    onHelp?.(task)
                                                  }}
                                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                                >
                                                  Pomóż mi
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setOpenMenuFor(null)
                                                    openDatePicker(task.id)
                                                  }}
                                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                                >
                                                  Przenieś
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setOpenMenuFor(null)
                                                    handleDeleteClick(task.id)
                                                  }}
                                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-red-600"
                                                >
                                                  Usuń
                                                </button>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
