'use client'

import { useEffect, useState } from 'react'

interface Task {
  id: string
  content: string
  due?: string
  priority?: number
}

export default function TodoistTasks({ token }: { token: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('today')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(`/api/todoist/tasks?token=${token}&filter=${filter}`)
      .then(res => res.json())
      .then(data => setTasks(data.tasks || []))
      .finally(() => setLoading(false))
  }, [token, filter])

  if (loading) return <p className="text-sm text-neutral-500">⏳ Wczytywanie zadań...</p>

  if (tasks.length === 0) return <p className="text-sm text-neutral-500">Brak zadań dla filtru „{filter}”.</p>

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-200 py-2 px-2 flex gap-2">
  {['today', 'tomorrow', 'overdue', '7 days'].map(f => (
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

      <ul className="space-y-2">
        {tasks.map(t => (
          <li key={t.id} className="border rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <p className="font-medium">{t.content}</p>
              {t.due && <span className="text-xs text-neutral-500">{t.due}</span>}
            </div>
            {t.priority && (
              <div className="text-xs text-yellow-600 mt-1">Priorytet: {t.priority}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
