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

export default function TodoistTasks({
  token,
  filter,
  onChangeFilter,
}: {
  token: string
  filter: string
  onChangeFilter: (f: string) => void
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(`/api/todoist/tasks?token=${token}&filter=${filter}`)
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks || []))
      .finally(() => setLoading(false))
  }, [token, filter])

  if (loading)
    return (
      <p className="text-sm text-neutral-500 mt-4">⏳ Wczytywanie zadań...</p>
    )

  // 🔧 Grupowanie po dacie
  const groupedByDate = tasks.reduce((acc, t) => {
    const date = t.due || 'Brak terminu'
    if (!acc[date]) acc[date] = []
    acc[date].push(t)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div className="space-y-4">
      {/* 🔹 Sticky belka filtrów */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-200 py-2 px-2 flex gap-2">
        {['today', 'tomorrow', 'overdue', '7 days'].map((f) => (
          <button
            key={f}
            onClick={() => onChangeFilter(f)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
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
                <h3 className="text-sm font-semibold text-neutral-700 mb-2 border-b pb-1">
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
                    <TaskCard
                      key={t.id}
                      task={t}
                      token={token}
                      onAction={() => {}}
                    />
                  ))}
                </div>
              </div>
            ))
        ) : tasks.length === 0 ? (
          <p className="text-sm text-neutral-500 mt-2">
            Brak zadań dla filtru „{filter}”.
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} token={token} onAction={() => {}} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
