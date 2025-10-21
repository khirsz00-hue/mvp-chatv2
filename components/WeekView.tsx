'use client'

import React, { useEffect, useState } from 'react'
import {
  format,
  addDays,
  parseISO,
  isValid,
  startOfDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  DragDropContext,
  Droppable,
  Draggable,
} from 'react-beautiful-dnd'
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
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  const [columns, setColumns] = useState<Record<string, any[]>>({})
  const [activeDay, setActiveDay] = useState<string | null>(null)

  const parseDateSafe = (value?: string) => {
    if (!value) return null
    try {
      const clean = value.includes('T') ? value.split('T')[0] : value
      const parsed = parseISO(clean)
      return isValid(parsed) ? startOfDay(parsed) : null
    } catch {
      return null
    }
  }

  // 📅 grupowanie zadań po dniu
  useEffect(() => {
    const grouped: Record<string, any[]> = {}
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd')
      grouped[key] = []
    }
    for (const t of tasks) {
      const parsed = parseDateSafe(t?.due?.date)
      const key = parsed ? format(parsed, 'yyyy-MM-dd') : null
      if (key && grouped[key]) grouped[key].push(t)
    }
    setColumns(grouped)
  }, [tasks])

  // 🎯 obsługa drag & drop (bez typów TS)
  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result
    setActiveDay(null)
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
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* 📆 Nagłówek tygodnia */}
      <motion.div
        className="text-center py-4 border-b border-gray-200 bg-white shadow-sm mb-3 sticky top-0 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
          {format(weekStart, 'd MMM', { locale: pl })} –{' '}
          {format(weekEnd, 'd MMM yyyy', { locale: pl })}
        </h2>
      </motion.div>

      {/* 🧱 Siatka dni */}
      <DragDropContext
        onDragEnd={handleDragEnd}
        onDragStart={(e: any) => setActiveDay(e.source.droppableId)}
      >
        <div className="grid grid-cols-7 gap-3 px-3 pb-6 flex-1 overflow-x-auto">
          {days.map((date) => {
            const key = format(date, 'yyyy-MM-dd')
            const dayTasks = columns[key] || []
            const isToday =
              format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

            return (
              <Droppable key={key} droppableId={key}>
                {(provided, snapshot) => (
                  <motion.div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col bg-white border border-gray-200 rounded-xl p-2 shadow-sm min-w-[180px] transition-all duration-200 ${
                      snapshot.isDraggingOver
                        ? 'bg-blue-50 border-blue-300 shadow-lg'
                        : 'hover:border-gray-300'
                    } ${isToday ? 'ring-1 ring-blue-400' : ''}`}
                    animate={{ scale: snapshot.isDraggingOver ? 1.02 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* 🗓️ Nagłówek dnia */}
                    <div className="text-center font-semibold text-gray-700 mb-2 text-sm border-b pb-1">
                      <span
                        className={`${
                          isToday ? 'text-blue-600' : ''
                        } capitalize`}
                      >
                        {format(date, 'EEE', { locale: pl })}
                      </span>
                      <span className="text-xs text-gray-500 block">
                        {format(date, 'd MMM', { locale: pl })}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        📋 {dayTasks.length}
                      </span>
                    </div>

                    {/* 🧾 Zadania */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                      <AnimatePresence>
                        {dayTasks.length === 0 ? (
                          <motion.p
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-xs text-gray-400 italic text-center mt-4"
                          >
                            Brak zadań
                          </motion.p>
                        ) : (
                          dayTasks.map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <motion.div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  layout
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.25 }}
                                  className={`relative group bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-2 flex items-center justify-between shadow-sm hover:shadow-md cursor-grab ${
                                    snapshot.isDragging
                                      ? 'shadow-xl scale-[1.02] border-blue-300'
                                      : ''
                                  }`}
                                >
                                  {/* ⭕ Ukończ */}
                                  <button
                                    onClick={() => onComplete?.(task.id)}
                                    className="w-4 h-4 rounded-full border-2 border-gray-400 hover:border-green-500 hover:bg-green-500 transition flex items-center justify-center"
                                    title="Ukończ"
                                  >
                                    <CheckCircle2
                                      size={12}
                                      className="text-white opacity-0 group-hover:opacity-100 transition"
                                    />
                                  </button>

                                  {/* 📋 Treść */}
                                  <div className="flex-1 mx-2 min-w-0">
                                    <p className="text-[13px] font-medium text-gray-800 truncate">
                                      {task.content}
                                    </p>
                                    {task.project_name && (
                                      <p className="text-[10px] text-gray-500 truncate">
                                        📁 {task.project_name}
                                      </p>
                                    )}
                                  </div>

                                  {/* ⋯ Menu */}
                                  <div className="relative group/menu">
                                    <button className="p-1 text-gray-400 hover:text-gray-700 transition">
                                      <MoreVertical size={14} />
                                    </button>

                                    <motion.div
                                      initial={{ opacity: 0, y: -4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute right-0 top-5 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50 opacity-0 group-hover/menu:opacity-100 pointer-events-none group-hover/menu:pointer-events-auto"
                                    >
                                      <button
                                        onClick={() => onHelp?.(task)}
                                        className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
                                      >
                                        💬 Pomóż mi
                                      </button>
                                      <button
                                        onClick={() => onDelete?.(task.id)}
                                        className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
                                      >
                                        🗑 Usuń
                                      </button>
                                      <button
                                        onClick={() => {
                                          const newDate = prompt(
                                            'Nowa data (rrrr-mm-dd)',
                                            key
                                          )
                                          if (newDate)
                                            onMove?.(task.id, new Date(newDate))
                                        }}
                                        className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
                                      >
                                        📦 Przenieś
                                      </button>
                                    </motion.div>
                                  </div>
                                </motion.div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </Droppable>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
