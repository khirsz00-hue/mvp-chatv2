'use client'

import { useEffect, useState } from 'react'
import TaskCard from './TaskCard'
import { motion, AnimatePresence } from 'framer-motion'

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

  // 🔁 Reaguj na aktualizacje
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
    return <p className="text-sm text-neutral-500 mt-4 text-center">⏳ Wczytywanie zadań...</p>

  // 🔧 Grupowanie po dacie (dla filtru "7 days")
  const groupedByDate = tasks.reduce((acc, t) => {
    const date = t.due || 'Brak terminu'
    if (!acc[date]) acc[date] = []
    acc[date].push(t)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div className="space-y-4">
      {/* 🔹 Nowoczesny pasek filtrów */}
      <div className="sticky top-0 z-20 flex justify-center py-3 bg-white/70 backdrop-blur-md border-b border-gray-200 shadow-sm rounded-b-xl">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white/70 backdrop-blur-md shadow-sm">
          {[
            { key: 'today', label: 'Dziś' },
            { key: 'tomorrow', label: 'Jutro' },
            { key: '7 days', label: 'Tydzień' },
            { key: 'overdue', label: 'Przeterminowane' },
          ].map((f) => (
            <motion.button
              key={f.key}
              onClick={() => onChangeFilter(f.key as any)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                filter === f.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 🔹 Lista zadań */}
      <AnimatePresence mode="popLayout">
        <div className="mt-3">
          {filter === '7 days' ? (
            Object.keys(groupedByDate)
              .sort()
              .map(date => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mb-6"
                >
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
                      <motion.div
                        key={t.id}
                        whileHover={{ scale: 1.01 }}
                        className="cursor-pointer transition rounded-lg hover:bg-gray-50"
                        onClick={() => onOpenTaskChat?.(t)}
                      >
                        <TaskCard task={t} token={token} onAction={() => {}} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))
          ) : tasks.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-neutral-500 mt-4 text-center"
            >
              Brak zadań dla filtru „{filter}”.
            </motion.p>
          ) : (
            <ul className="space-y-2">
              {tasks.map(t => (
                <motion.li
                  key={t.id}
                  whileHover={{ scale: 1.01 }}
                  className="cursor-pointer transition rounded-lg hover:bg-gray-50"
                  onClick={() => onOpenTaskChat?.(t)}
                >
                  <TaskCard task={t} token={token} onAction={() => {}} />
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </AnimatePresence>
    </div>
  )
}
