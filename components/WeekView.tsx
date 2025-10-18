// 📅 app/components/WeekView.tsx
'use client'

import React from 'react'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

interface WeekViewProps {
  tasks: any[]
  onComplete?: (id: string) => void
  onMove?: (id: string) => void
  onDelete?: (id: string) => void
  onHelp?: (task: any) => void
}

export default function WeekView({ tasks = [], onComplete, onMove, onDelete, onHelp }: WeekViewProps) {
  // 📆 Zakres tygodnia (poniedziałek → niedziela)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  // 🗂️ Grupowanie zadań po dniu
  const tasksByDay = days.map((day) => {
    const dayTasks = tasks.filter((t) => {
      if (!t.due?.date) return false
      const taskDate = parseISO(t.due.date)
      return isSameDay(taskDate, day)
    })
    return { date: day, tasks: dayTasks }
  })

  return (
    <div className="grid grid-cols-7 gap-3 px-3 pb-6">
      {tasksByDay.map(({ date, tasks }) => (
        <div
          key={date.toISOString()}
          className="flex flex-col bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm min-h-[70vh]"
        >
          {/* 📅 Nagłówek dnia */}
          <div className="text-center font-semibold text-gray-700 mb-2">
            {format(date, 'EEE', { locale: pl })} <br />
            <span className="text-xs text-gray-500">{format(date, 'd MMM', { locale: pl })}</span>
          </div>

          {/* 🧾 Lista zadań */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {tasks.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center mt-4">Brak zadań</p>
            )}

            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-2 hover:shadow-md transition cursor-default flex flex-col justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800 text-sm truncate">{task.content}</p>
                  {task.project_id && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      📁 {task.project_name || task.project_id}
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={() => onComplete?.(task.id)}
                    className="text-[11px] bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                  >
                    ✅ Ukończ
                  </button>
                  <button
                    onClick={() => onMove?.(task.id)}
                    className="text-[11px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    📦 Przenieś
                  </button>
                  <button
                    onClick={() => onDelete?.(task.id)}
                    className="text-[11px] bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                  >
                    🗑️ Usuń
                  </button>
                  <button
                    onClick={() => onHelp?.(task)}
                    className="text-[11px] bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                  >
                    💬 Pomóż mi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
