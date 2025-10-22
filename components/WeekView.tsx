'use client'

import React, { useEffect, useState } from 'react'
import {
  format,
  addDays,
  startOfWeek,
  startOfDay,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  DragDropContext,
  Droppable,
  Draggable,
} from 'react-beautiful-dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreVertical, CheckCircle2, CalendarDays } from 'lucide-react'
import { Tooltip } from 'react-tooltip'

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
  const [draggingTask, setDraggingTask] = useState<any | null>(null)

  // ✅ poprawne parsowanie dat z Todoista (bez przesunięcia strefy)
  const parseDateSafe = (value?: string) => {
    if (!value) return null
    try {
      const [y, m, d] = value.split('-').map(Number)
      return new Date(y, m - 1, d)
    } catch {
      return null
    }
  }

  // 🗂️ Grupowanie zadań po dniu
  useEffect(() => {
    if (!tasks || tasks.length === 0) return
    const grouped: Record<string, any[]> = {}
    for (const day of days) grouped[format(day, 'yyyy-MM-dd')] = []

    for (const t of tasks) {
      const parsed = parseDateSafe(t?.due?.date)
      const key = parsed ? format(parsed, 'yyyy-MM-dd') : null
      if (key && grouped[key]) grouped[key].push(t)
    }

    console.log('✅ WeekView otrzymał taski:', tasks.length)
    console.log('📅 Zgrupowane kolumny:', grouped)
    setColumns(grouped)
  }, [tasks])

  // 🎯 Drag & Drop
  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result
    setDraggingTask(null)
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

  // 🚫 Gdy brak danych
  if (!Object.keys(columns).length) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500 italic">
        ⏳ Wczytywanie zadań...
      </div>
    )
  }

  // 🎨 Widok tygodnia
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* Nagłówek tygodnia */}
      <motion.div
        className="text-center py-4 border-b border-gray-200 bg-white shadow-sm mb-3 sticky top-0 z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
          {format(weekStart, 'd MMM', { locale: pl })} –{' '}
          {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
        </h2>
      </motion.div>

      {/* Siatka dni */}
      <DragDropContext
        onDragEnd={handleDragEnd}
        onDragStart={(e: any) => {
          const all = columns[e.source.droppableId]
          setDraggingTask(all?.find((t) => t.id === e.draggableId))
        }}
      >
        <div className="grid grid-cols-7 gap-3 px-3 pb-6 flex-1 overflow-x-auto">
          {days.map((date) => {
            const key = format(date, 'yyyy-MM-dd')
            const dayTasks = columns[key] || []
            const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

            return (
              <Droppable key={key} droppableId={key}>
                {(provided: any, snapshot: any) => (
                  <motion.div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col bg-white border border-gray-200 rounded-xl p-2 shadow-sm min-w-[180px] transition-all duration-200 ${
                      snapshot.isDraggingOver
                        ? 'bg-blue-50 border-blue-300 shadow-lg'
                        : 'hover:border-gray-300'
                    } ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    animate={{ scale: snapshot.isDraggingOver ? 1.02 : 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Nagłówek dnia */}
                    <div className="text-center font-semibold text-gray-700 mb-2 text-sm border-b pb-1">
                      <span
                        className={`capitalize ${
                          isToday ? 'text-blue-600 font-bold' : ''
                        }`}
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

                    {/* Lista zadań */}
                    <div className="flex-1 overflow-y-auto space-y-2 relative">
                      <AnimatePresence>
                        {dayTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided: any, snapshot: any) => (
                              <motion.div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.25 }}
                                className={`relative group bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between shadow-sm hover:shadow-md cursor-grab ${
                                  snapshot.isDragging
                                    ? 'opacity-50 border-blue-300 scale-[1.02]'
                                    : ''
                                }`}
                                data-tooltip-id={`task-${task.id}`}
                              >
                                {/* Checkbox */}
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

                                <div className="flex-1 mx-2 min-w-0">
                                  <p className="text-[13px] font-medium text-gray-800 truncate">
                                    {task.content}
                                  </p>
                                </div>

                                {/* ⋮ Menu */}
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
                                      className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100 text-red-600"
                                    >
                                      🗑 Usuń
                                    </button>
                                  </motion.div>
                                </div>

                                {/* Tooltip */}
                                <Tooltip
                                  id={`task-${task.id}`}
                                  place="bottom"
                                  className="z-50 bg-gray-900 text-white text-xs rounded-md px-3 py-1 shadow-lg"
                                  content={
                                    <>
                                      <div className="flex items-center gap-1">
                                        <CalendarDays size={12} />{' '}
                                        {task.due?.date || 'Brak daty'}
                                      </div>
                                      <div className="text-gray-300">
                                        📁 {task.project_name || 'Bez projektu'}
                                      </div>
                                    </>
                                  }
                                />
                              </motion.div>
                            )}
                          </Draggable>
                        ))}
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
