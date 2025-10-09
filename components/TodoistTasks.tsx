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
  onOpenTaskChat?: (task: Task) => void   // ✅ DODANE — dla czatu
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
      .then((res) => res.json())
      .then((data) => {
        const t = data.tasks || []
        setTasks(t)
        onUpdate?.(t)
      })
      .catch((err) => console.error('❌ Błąd pobierania zadań:', err))
      .finally(() => setLoading(false))
  }, [token, filter])

  // 🔁 Reaguj na aktualizacje (np. gdy AI doda komentarz)
  useEffect(() => {
    const handleUpdate = () => {
      fetch(`/api/todoist/tasks?token=${token}&filter=${filter}`)
        .then((res) => res.json())
        .then((data) => setTasks(data.tasks || []))
        .catch((err) => console.error('❌ Błąd odświeżenia:', err))
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
      {/* 🔹 Sticky belka filtrów */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-neutral-200 py-2 px-2 flex gap-2">
        {(['today', 'tomorrow', 'overdue', '7 days'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onChangeFilter(f)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            {f === 'today'
              ? 'Dziś'
              : f === 'tomorrow'
              ? 'Jutro'
              : f === 'overdue'
              ? 'Przeterminowane'
              : 'Tydzień'}
          </button>
        ))}
      </div>

      {/* 🔹 Lista zadań */}
      <div className="mt-3">
        {filter === '7 days' ? (
          Object.keys(groupedByDate)
            .sort()
            .map((date) => (
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
                  {groupedByDate[date].map((t) => (
                    <div
                      key={t.id}
                      className="cursor-pointer transition hover:bg-green-50 rounded-lg"
                      onClick={() => onOpenTaskChat?.(t)}   // ✅ Klik = otwarcie czatu
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
            {tasks.map((t) => (
              <li
                key={t.id}
                className="cursor-pointer transition hover:bg-green-50 rounded-lg"
                onClick={() => onOpenTaskChat?.(t)}   // ✅ Klik = otwarcie czatu
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
