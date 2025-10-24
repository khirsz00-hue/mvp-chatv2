'use client'

import React, { useEffect, useState } from 'react'
import { format, addDays, startOfWeek, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import TaskCard from './TaskCard'
import { Plus, CheckCircle2, MoreVertical } from 'lucide-react'
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
    // group tasks by date (yyyy-MM-dd)
    const grouped: Record<string, any[]> = {}
    days.forEach((d) => grouped[format(d, 'yyyy-MM-dd')] = [])
    const firstKey = format(days[0], 'yyyy-MM-dd')
    for (const t of tasks) {
      const key = t._dueYmd ?? (t.due?.date ?? (typeof t.due === 'string' ? t.due : null))
      if (!key) grouped[firstKey].push(t)
      else if (grouped[key]) grouped[key].push(t)
      else grouped[firstKey].push(t)
    }
    setColumns(grouped)
  }, [tasks, days])

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const srcCol = Array.from(columns[source.droppableId] || [])
    const [moved] = srcCol.splice(source.index, 1)
    const dstCol = Array.from(columns[destination.droppableId] || [])
    dstCol.splice(destination.index, 0, moved)
    const newCols = { ...columns, [source.droppableId]: srcCol, [destination.droppableId]: dstCol }
    setColumns(newCols)

    if (source.droppableId !== destination.droppableId) {
      onMove?.(draggableId, destination.droppableId)
      try { appendHistory(draggableId, source.droppableId, destination.droppableId) } catch {}
    }
  }

  if (!columns || Object.values(columns).every(c => c.length === 0)) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">Brak zadań w tym tygodniu.</div>
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 w-full">
      <div className="text-center py-3 border-b border-gray-200 bg-white mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{format(weekStart, 'd MMM', { locale: pl })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}</h2>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 px-2 md:px-3 pb-6 flex-1 w-full">
          {days.map((date) => {
            const key = format(date, 'yyyy-MM-dd')
            const dayTasks = columns[key] || []
            const isToday = key === format(today, 'yyyy-MM-dd')
            return (
              <Droppable droppableId={key} key={key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-[200px] border rounded-md p-2 bg-white/90 ${snapshot.isDraggingOver ? 'ring-2 ring-blue-200' : ''}`}>
                    <div className={`mb-2 ${isToday ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>
                      <div className="flex items-center justify-between">
                        <div>{format(date, 'EEE d', { locale: pl })}</div>
                        <div>
                          <button onClick={(e) => { e.stopPropagation(); onAddForDate?.(key) }} title="Dodaj" className="p-1 rounded hover:bg-gray-100">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {dayTasks.map((task, idx) => (
                        <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} style={{ ...prov.draggableProps.style }}>
                              <div className={`p-2 rounded-lg shadow-sm border bg-white cursor-grab ${snap.isDragging ? 'z-50' : ''}`}>
                                <div onClick={() => onOpenTask?.(task)}>
                                  <TaskCard task={task} token={undefined} selectable={false} onOpen={onOpenTask} wrapTitle />
                                </div>

                                <div className="mt-2 flex items-center gap-2 justify-end">
                                  <button onClick={(e) => { e.stopPropagation(); onComplete?.(task.id) }} className="text-xs px-2 py-1 bg-green-50 rounded">Ukończ</button>
                                  <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); onHelp?.(task) }} className="text-xs px-2 py-1 bg-gray-50 rounded">Pomóż mi</button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
