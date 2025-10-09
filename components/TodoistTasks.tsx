'use client'

import { useEffect, useState } from 'react'
import TaskCard from './TaskCard'

interface Task {
  id: string
  content: string
  due?: string
  priority?: number
  project_id?: string
}

interface TodoistTasksProps {
  token: string
  filter: 'today' | 'tomorrow' | 'overdue' | '7 days'
  onChangeFilter: (filter: 'today' | 'tomorrow' | 'overdue' | '7 days') => void
  onUpdate?: (tasks: Task[]) => void
  onOpenTaskChat?: (task: Task) => void
}

export default function TodoistTasks({
  token,
  filter,
  onChangeFilter,
  onUpdate,
  onOpenTaskChat,
}: TodoistTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // 🔹 Pobierz zadania z backendu API
  useEffect(() => {
    if (!token) return
    setLoading(true)

    fetch(`/api/todoist/tasks?token=${token}&filter=${filter}`)
      .then(res => res.json())
      .then(data => {
        const t = data.tasks || []
        setTasks(t)
        onUpdate?.(t)
      })
      .catch(err => console.error('❌ Błąd pobierania zadań:', err))
      .finally(() => setLoading(false))
  }, [token, filter])

  // 🔁 Reaguj na aktualizacje (np. po akcji AI)
  useEffect(() => {
    const handleUpdate = () => {
      fetch(`/api/todoist/tasks?token=${token}&filter=${filter}`)
        .then(res => res.json())
        .then(data => setTasks(data.tasks || []))
        .catch(err => console.error('❌ Błąd odświeżenia:', err))
    }
    window.addEventListener('taskUpdated', handleUpdate)
    return () => window.removeEventListener('taskUpdated', handleUpdate)
  }, [token, filter])

  if (loading)
    return <p className="text-sm text-neutral-500 mt-4">⏳ Wczytywanie zadań...</p>

  // 🔧 Grupowanie po dacie (dla filtru "7 days")
  const groupedByDate = tasks.reduce((acc, t) => {
    const date = t.due || 'Brak terminu'
    if (!acc[date]) acc[date] = []
    acc[date].push(t)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div className="space-y-4">
      {/* 🔹 Elegancka belka filtrów */}
      <div className="sticky top-0 z-20 border-b bg-gradient-to-r from-green-50 via-emerald-100 to-green-50 backdrop-blur-md px-3 py-3 flex flex-wrap gap-2 justify-center shadow-sm">
        {[
          { key: 'today', label: '📅 Dziś', color: 'bg-green-600' },
          { key: 'tomorrow', label: '➡️ Jutro', color: 'bg-blue-600' },
          { key: '7 days', label: '🗓️ Tydzień', color: 'bg-purple-600' },
          { key: 'overdue', label: '⚠️ Przeterminowane', color: 'bg-red-600' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => onChangeFilter(key as any)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
              ${
                filter === key
                  ? `${color} text-white shadow-lg scale-105`
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 🔹 Lista zadań */}
      <div className="mt-3">
        {filter === '7 days' ? (
          Object.keys(groupedByDate)
            .sort()
            .map(date => (
              <div key={date} className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-700 mb-2 border-b pb-1 flex items-center gap-1">
                  📅{' '}
                  {date === 'Brak terminu'
                    ? 'Brak terminu'
                    : new Date(date).toLocaleDateString('pl-PL', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                </h3>
                <div className="space-y-2">
                  {groupedByDate[date].map(t => (
                    <div
                      key={t.id}
                      className="cursor-pointer transition hover:bg-green-50 rounded-lg"
                      onClick={() => onOpenTaskChat?.(t)}
                    >
                      <TaskCard task={t} token={token} onAction={() => {}} />
                    </div>
                  ))}
                </div>
              </div>
            ))
        ) : tasks.length === 0 ? (
          <p className="text-sm text-neutral-500 mt-2 text-center">
            Brak zadań dla filtru „{filter}”.
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map(t => (
              <li
                key={t.id}
                className="cursor-pointer transition hover:bg-green-50 rounded-lg"
                onClick={() => onOpenTaskChat?.(t)}
              >
                <TaskCard task={t} token={token} onAction={() => {}} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
