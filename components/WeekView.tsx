'use client'

import React, { useEffect, useState } from 'react'
import {
  format,
  addDays,
  startOfWeek,
  startOfDay,
  parseISO,
  isSameDay,
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
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  const [columns, setColumns] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  // 🔧 grupowanie po dniu (obsługa obu formatów due: string lub due: { date })
  useEffect(() => {
    if (!tasks || tasks.length === 0) return setLoading(true)

    const grouped: Record<string, any[]> = {}
    for (const day of days) grouped[format(day, 'yyyy-MM-dd')] = []

    for (const t of tasks) {
      // obsłuż zarówno { due: { date: '...' } } jak i { due: '...' }
      const dueStr =
        typeof t.due === 'string' ? t.due : t.due?.date ?? null
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

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
        ⏳ Wczytywanie zadań...
      </div>
    )
  }

  if (Object.values(columns).every((col) => col.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
        Brak zadań w tym tygodniu.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="text-center py-3 border-b border-gray-200 bg-white shadow-sm mb-3">
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
          {format(weekStart, 'd MMM', { locale: pl })} –{' '}
          {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
        </h2>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-3 px-3 pb-6 flex-1 overflow-x-auto">
          {days.map((date) => {
            const key = format(date, 'yyyy-MM-dd')
            const dayTasks = columns[key] || []
            const isToday =
              format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
            return (
              <div key={key} className="week-column">
                <div className="week-column-header">
                  <div>
                    <div className={isToday ? 'week-day-today' : ''}>
                      {format(date, 'EEE d', { locale: pl })}
                    </div>
                  </div>
                </div>
                <div className="week-column-tasks">
                  {dayTasks.map((task: any, index: number) => (
                    <div key={task.id} className="task-card">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {task.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
