'use client'

import React, { useEffect, useState } from 'react'
import { format, addDays, startOfWeek, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import TaskCard from './TaskCard'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseDueToLocalYMD } from '../utils/date'
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

  useEffect(() => {
    const grouped: Record<string, any[]> = {}
    const keys = days.map((d) => format(d, 'yyyy-MM-dd'))
    keys.forEach((k) => (grouped[k] = []))

    tasks.forEach((t) => {
      const due = t._dueYmd ?? (t.due?.date ?? (typeof t.due === 'string' ? t.due : null))
      if (!due) {
        // assign to first day if no date
        grouped[keys[0]].push(t)
        return
      }
      if (keys.includes(due)) grouped[due].push(t)
      else {
        // if due outside week, ignore for week view (keeps previous behavior), or optionally push to first/last col
        // we'll skip adding to keep week filtered.
      }
    })
    setColumns(grouped)
  }, [tasks, days])

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const src = Array.from(columns[source.droppableId] || [])
    const [moved] = src.splice(source.index, 1)
    const dst = Array.from(columns[destination.droppableId] || [])
    dst.splice(destination.index, 0, moved)
    const newCols = { ...columns, [source.droppableId]: src, [destination.droppableId]: dst }
    setColumns(newCols)

    if (source.droppableId !== destination.droppableId) {
      onMove?.(draggableId, destination.droppableId)
      try { appendHistory(draggableId, source.droppableId, destination.droppableId) } catch {}
    }
  }

  if (!columns || Object.values(columns).every((c) => c.length === 0)) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">Brak zadań w tym tygodniu.</div>
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 w-full">
      <div className="text-center py-3 border-b border-gray-200 bg-white mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{format(weekStart, 'd MMM', { locale: pl })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}</h2>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 px-2 md:px-3 pb-6 flex-1 w-full min-h-[300px]">
          {days.map((date) => {
            const key = format(date, 'yyyy-MM-dd')
            const dayTasks = columns[key] || []
            const isToday = key === format(today, 'yyyy-MM-dd')
            return (
              <Droppable droppableId={key} key={key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-[200px] border rounded-md p-2 bg-white/90 flex flex-col ${snapshot.isDraggingOver ? 'ring-2 ring-blue-200' : ''}`}>
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
                            {(prov, snap) => (
                              <motion.div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.12 }}
                                style={{ ...prov.draggableProps.style }}
                                className=""
                              >
                                <div className={`p-2 rounded-lg shadow-sm border bg-white ${snap.isDragging ? 'z-50' : ''}`}>
                                  <div onClick={() => onOpenTask?.(task)}>
                                    <TaskCard task={task} token={undefined} selectable={false} onOpen={onOpenTask} wrapTitle />
                                  </div>
                                  <div className="mt-2 flex items-center gap-2 justify-end">
                                    <button onClick={(e) => { e.stopPropagation(); onComplete?.(task.id) }} className="text-xs px-2 py-1 bg-green-50 rounded">Ukończ</button>
                                    <button onClick={(e) => { e.stopPropagation(); onHelp?.(task) }} className="text-xs px-2 py-1 bg-gray-50 rounded">Pomóż mi</button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
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
      </DragDropContext>
    </div>
  )
}
