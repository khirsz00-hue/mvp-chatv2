'use client'

import { useEffect, useState, useRef } from 'react'
import TaskCard from './TaskCard'
import { motion, AnimatePresence } from 'framer-motion'

interface Task {
  id: string
  content: string
  due?: string
  priority?: number
  project_id?: string
  project_name?: string
  labels?: string[]
}

interface Project {
  id: string
  name: string
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
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const lastUpdate = useRef<number>(0) // ⏱ zabezpieczenie przed spamowaniem fetchami

  // ✅ Bezpieczne pobieranie danych
  const loadTasks = async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)

    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/todoist/tasks?token=${token}&filter=${filter}`).then((r) => r.json()),
        fetch(`/api/todoist/projects?token=${token}`).then((r) => r.json()),
      ])

      const allTasks: Task[] = tasksRes.tasks || []
      const allProjects: Project[] = projectsRes.projects || []

      const enriched = allTasks.map((t: Task) => ({
        ...t,
        project_name:
          allProjects.find((p: Project) => p.id === t.project_id)?.name || 'Brak projektu',
      }))

      setTasks(enriched)
      setProjects(allProjects)
      onUpdate?.(enriched)
    } catch (err) {
      console.error('❌ Błąd ładowania:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // 🧠 Inicjalne ładowanie przy zmianie filtru
  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]) // 👈 tylko zmiana filtru, nie tokenu

  // 🔄 Odświeżanie po eventach "taskUpdated"
  useEffect(() => {
    const handleUpdate = () => {
      const now = Date.now()
      if (now - lastUpdate.current < 2000) return // ⏳ antyspam: max 1 fetch na 2s
      lastUpdate.current = now
      loadTasks(true) // ciche odświeżenie
    }

    window.addEventListener('taskUpdated', handleUpdate)
    return () => window.removeEventListener('taskUpdated', handleUpdate)
  }, []) // 🔒 działa tylko raz

  // 📂 Filtrowanie po projekcie
  const visibleTasks =
    selectedProject === 'all'
      ? tasks
      : tasks.filter((t) => t.project_id === selectedProject)

  // 🧭 Grupowanie po dacie (dla filtru "7 days")
  const groupedByDate = visibleTasks.reduce((acc, t) => {
    const date = t.due || 'Brak terminu'
    if (!acc[date]) acc[date] = []
    acc[date].push(t)
    return acc
  }, {} as Record<string, Task[]>)

  if (loading)
    return <p className="text-sm text-neutral-500 mt-4 text-center">⏳ Wczytywanie zadań...</p>

  return (
    <div className="space-y-4">
      {/* 🔹 Pasek filtrów + projekty */}
      <div className="sticky top-0 z-20 flex flex-col md:flex-row items-center justify-between gap-2 px-3 py-3 bg-white/70 backdrop-blur-md border-b border-gray-200 shadow-sm rounded-b-xl">
        <div className="flex flex-wrap justify-center gap-2">
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

        {/* Projekty */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <option value="all">📁 Wszystkie projekty</option>
          {projects.map((p: Project) => (
            <option key={p.id} value={p.id}>
              💼 {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 🔹 Lista zadań */}
      <AnimatePresence mode="popLayout">
        {filter === '7 days' ? (
          Object.keys(groupedByDate)
            .sort()
            .map((date) => (
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
                  {groupedByDate[date].map((t) => (
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
        ) : visibleTasks.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-neutral-500 mt-4 text-center"
          >
            Brak zadań dla tego filtru.
          </motion.p>
        ) : (
          <ul className="space-y-2">
            {visibleTasks.map((t) => (
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
      </AnimatePresence>
    </div>
  )
}
