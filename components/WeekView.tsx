'use client'

import React, { useEffect, useState, useRef } from 'react'
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
  onAddForDate?: (ymd: string) => void // open add task modal prefilled with date
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
  const [loading, setLoading] = useState(true)
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const datePickers = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setColumns({})
      return setLoading(true)
    }
    const grouped: Record<string, any[]> = {}
    for (const day of days) grouped[format(day, 'yyyy-MM-dd')] = []
    const dayKeys = days.map((d) => format(d, 'yyyy-MM-dd'))
    const firstColKey = dayKeys[0]
    for (const t of tasks) {
      const dueYmdFromOpt = t._dueYmd ?? null
      const dueRaw = t.due?.date ?? (typeof t.due === 'string' ? t.due : null)
      const dueYmd = dueYmdFromOpt ?? dueRaw ?? null
      if (!dueYmd) {
        grouped[firstColKey].push(t)
        continue
      }
      if (dayKeys.includes(dueYmd)) grouped[dueYmd].push(t)
    }
    setColumns(grouped)
    setLoading(false)
  }, [tasks, days])

  const handleDragStart = (start: any) => {
    setDraggingTaskId(start.draggableId ?? null)
    if (typeof document !== 'undefined') document.body.classList.add('dragging-active')
  }

  const handleDragEnd = (result: any) => {
    try {
      const { destination, source, draggableId } = result
      if (typeof document !== 'undefined') document.body.classList.remove('dragging-active')
      setDraggingTaskId(null)

      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index) return

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
        onMove?.(draggableId, destination.droppableId)
        try { appendHistory(draggableId, source.droppableId, destination.droppableId) } catch {}
      }
    } catch (err) {
      if (typeof document !== 'undefined') document.body.classList.remove('dragging-active')
      setDraggingTaskId(null)
      console.error('handleDragEnd error', err)
    }
  }

  const handleCompleteClick = (id: string) => {
    onComplete?.(id)
    setColumns((prev) => {
      const copy: Record<string, any[]> = {}
      for (const k of Object.keys(prev)) copy[k] = prev[k].filter((t) => t.id !== id)
      return copy
    })
  }

  const handleDeleteClick = (id: string) => {
    onDelete?.(id)
    setColumns((prev) => {
      const copy: Record<string, any[]> = {}
      for (const k of Object.keys(prev)) copy[k] = prev[k].filter((t) => t.id !== id)
      return copy
    })
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">⏳ Wczytywanie zadań...</div>
  if (!columns || Object.values(columns).every((col) => col.length === 0)) return <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">Brak zadań w tym tygodniu.</div>

  return (
    <div className="flex flex-col h-full bg-gray-50 w-full">
      <div className="text-center py-3 border-b border-gray-200 bg-white shadow-sm mb-3">
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">{format(weekStart, 'd MMM', { locale: pl })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}</h2>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 px-2 md:px-3 pb-6 flex-1 overflow-x-auto w-full">
          {days.map((date) => {
            const key = format(date, 'yyyy-MM-dd')
            const dayTasks = columns[key] || []
            const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
            return (
              <Droppable droppableId={key} key={key}>
                {(provided: any, snapshot: any) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`week-column transition-all duration-150 ease-in-out ${snapshot.isDraggingOver ? 'ring-2 ring-blue-300 bg-blue-50/30' : 'bg-white/80'}`}>
                    <div className="week-column-header relative p-2">
                      <div className={`inline-block ${isToday ? 'font-semibold week-day-today' : ''}`}>{format(date, 'EEE d', { locale: pl })}</div>
                      <div className="absolute right-2 top-1">
                        <button onClick={() => onAddForDate?.(key)} title="Dodaj zadanie na ten dzień" className="p-1 rounded bg-white shadow-sm hover:bg-gray-100">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="week-column-tasks p-2">
                      {dayTasks.map((task: any, index: number) => (
                        <Draggable draggableId={String(task.id)} index={index} key={task.id}>
                          {(prov: any, snap: any) => {
                            const isDragging = snap.isDragging
                            return (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className="task-card-outer mb-2" style={{ ...prov.draggableProps.style }}>
                                <div className={`task-card-inner flex items-start gap-2 p-3 rounded-lg shadow-sm border border-gray-100 cursor-grab ${isDragging ? 'z-50 bg-white' : 'bg-white'}`}>
                                  <div className="flex-1 min-w-0" onClick={() => onOpenTask?.(task)}>
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-800 truncate break-words">{task.content}</div>
                                        <div className="text-xs text-gray-500 mt-1 truncate">{task.project_name || ''}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button title="Ukończ" onClick={() => handleCompleteClick(task.id)} className="p-1 rounded-full hover:bg-gray-100">
                                          <CheckCircle2 size={18} className="text-green-600" />
                                        </button>

                                        <div className="relative">
                                          <button onClick={() => setOpenMenuFor(openMenuFor === task.id ? null : task.id)} className="p-1 rounded hover:bg-gray-100" title="Więcej">
                                            <MoreVertical size={16} />
                                          </button>
                                          {openMenuFor === task.id && (
                                            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                              <button onClick={() => { setOpenMenuFor(null); onHelp?.(task) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Pomóż mi</button>
                                              <button onClick={() => { setOpenMenuFor(null); handleDeleteClick(task.id) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-red-600">Usuń</button>
                                            </div>
                                          )}
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
