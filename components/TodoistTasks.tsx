'use client'

import { useEffect, useState, useRef } from 'react'
import TaskCard, { TaskType } from './TaskCard'
import { motion, AnimatePresence } from 'framer-motion'

interface Project { id: string; name: string }

interface TodoistTasksProps {
  token: string
  filter: 'today' | 'tomorrow' | 'overdue' | '7 days' | '30 days'
  onChangeFilter: (f: 'today' | 'tomorrow' | 'overdue' | '7 days' | '30 days') => void
  onUpdate?: (tasks?: TaskType[]) => void
  onOpenTaskChat?: (task: TaskType) => void
  showHeaderFilters?: boolean
}

export default function TodoistTasks({ token, filter, onChangeFilter, onUpdate, onOpenTaskChat, showHeaderFilters = false }: TodoistTasksProps) {
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const lastUpdate = useRef<number>(0)

  const normalizeDue = (due: any) => {
    if (!due) return null
    const dueStr = typeof due === 'string' ? due : due?.date ?? null
    if (!dueStr) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueStr)) return new Date(dueStr + 'T12:00:00')
    const d = new Date(dueStr)
    return isNaN(d.getTime()) ? null : d
  }

  const loadTasks = async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/todoist/tasks?token=${encodeURIComponent(token)}&filter=${encodeURIComponent(filter)}`).then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch(`/api/todoist/projects?token=${encodeURIComponent(token)}`, { headers: { 'x-todoist-token': token } }).then(r => r.json()).catch(() => ({ projects: [] })),
      ])
      const fetchedTasks = tasksRes.tasks || tasksRes || []
      const mapped = (fetchedTasks as any[]).map((t) => ({
        ...t,
        due: t.due,
        _dueDate: normalizeDue(t.due),
        description: t.description || t.note || '',
      })) as TaskType[]
      setTasks(mapped)

      if (Array.isArray(projectsRes)) setProjects(projectsRes)
      else if (projectsRes.projects) setProjects(projectsRes.projects)
      else setProjects([])

      setLoading(false)
      onUpdate?.(mapped)
    } catch (err) {
      console.error('loadTasks error', err)
      setTasks([])
      setProjects([])
      setLoading(false)
    }
  }

  useEffect(() => { loadTasks() }, [filter])

  useEffect(() => {
    const handleUpdate = () => {
      const now = Date.now()
      if (now - lastUpdate.current < 2000) return
      lastUpdate.current = now
      loadTasks(true)
    }
    window.addEventListener('taskUpdated', handleUpdate)
    return () => window.removeEventListener('taskUpdated', handleUpdate)
  }, [token, filter])

  const visibleTasks = selectedProject === 'all' ? tasks : tasks.filter(t => t.project_id === selectedProject)

  if (loading) return <p className="text-sm text-neutral-500 mt-4 text-center">⏳ Wczytywanie zadań...</p>

  return (
    <div className="space-y-4 relative overflow-visible">
      {showHeaderFilters && (
        <div className="sticky top-0 z-30 flex flex-col md:flex-row items-center justify-between gap-2 px-3 py-3 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm rounded-b-xl">
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { key: 'today', label: 'Dziś' },
              { key: 'tomorrow', label: 'Jutro' },
              { key: '7 days', label: 'Tydzień' },
              { key: '30 days', label: 'Miesiąc' },
              { key: 'overdue', label: 'Przeterminowane' },
            ].map((f) => (
              <button key={f.key} onClick={() => onChangeFilter(f.key as any)} className={`filter-pill ${filter === f.key ? 'filter-pill--active' : ''}`}>{f.label}</button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400">
              <option value="all">📁 Wszystkie projekty</option>
              {projects.map((p) => <option key={p.id} value={p.id}>💼 {p.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="relative overflow-visible pb-16">
        <AnimatePresence mode="popLayout">
          {visibleTasks.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-neutral-500 mt-4 text-center">Brak zadań dla tego filtru.</motion.p>
          ) : (
            <ul className="space-y-2">
              {visibleTasks.map((t) => (
                <motion.li key={t.id} whileHover={{ scale: 1.01 }} className="cursor-pointer transition rounded-lg hover:bg-gray-50 overflow-visible" onClick={(e) => { if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).tagName === 'INPUT') return; onOpenTaskChat?.(t) }}>
                  <TaskCard task={t} token={token} onAction={() => loadTasks()} selectable selected={selectedTasks.has(t.id)} onSelectChange={(checked) => { const copy = new Set(selectedTasks); checked ? copy.add(t.id) : copy.delete(t.id); setSelectedTasks(copy) }} />
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
