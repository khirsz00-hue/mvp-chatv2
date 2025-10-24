'use client'

import { useEffect, useState, useRef } from 'react'
import TaskCard, { TaskType } from './TaskCard'
import { motion, AnimatePresence } from 'framer-motion'
import { parseDueToLocalYMD, ymdFromDate } from '../utils/date'

interface Project { id: string; name: string }

interface TodoistTasksProps {
  token: string
  filter: 'today' | 'tomorrow' | 'overdue' | '7 days' | '30 days'
  onChangeFilter: (filter: 'today' | 'tomorrow' | 'overdue' | '7 days' | '30 days') => void
  onUpdate?: (tasks?: TaskType[]) => void
  onOpenTaskChat?: (task: TaskType) => void
  showHeaderFilters?: boolean
  selectedProject?: string
  showContextMenu?: boolean
}

export default function TodoistTasks({
  token, filter, onChangeFilter, onUpdate, onOpenTaskChat, showHeaderFilters = true, selectedProject, showContextMenu = false,
}: TodoistTasksProps) {
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [localSelectedProject, setLocalSelectedProject] = useState<string>('all')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showBulkDate, setShowBulkDate] = useState(false)
  const [bulkDate, setBulkDate] = useState<string>('')
  const lastUpdate = useRef<number>(0)

  const effectiveProject = selectedProject ?? localSelectedProject

  const loadTasks = async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/todoist/tasks?token=${encodeURIComponent(token)}&filter=${encodeURIComponent(filter)}`).then((r) => r.json()).catch(() => ({ tasks: [] })),
        fetch(`/api/todoist/projects?token=${encodeURIComponent(token)}`, { headers: { 'x-todoist-token': token } }).then((r) => r.json()).catch(() => ({ projects: [] })),
      ])

      const fetchedTasks = tasksRes.tasks || tasksRes || []
      const mapped = (fetchedTasks as any[]).map((t) => {
        const _dueYmd = parseDueToLocalYMD(t.due)
        return { ...t, due: t.due, _dueYmd, description: t.description || t.note || '' } as TaskType
      })

      const projectFiltered = effectiveProject === 'all' ? mapped : mapped.filter((t) => t.project_id === effectiveProject)

      if (filter === 'today') {
        const todayYmd = ymdFromDate(new Date())
        const overdue = projectFiltered.filter((t) => (t._dueYmd ? t._dueYmd < todayYmd : false))
        const todayTasks = projectFiltered.filter((t) => (t._dueYmd ? t._dueYmd === todayYmd : false))
        setTasks([...overdue, ...todayTasks])
      } else {
        setTasks(projectFiltered)
      }

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

  useEffect(() => { loadTasks(); }, [filter, effectiveProject, token])

  useEffect(() => {
    const handleUpdate = () => {
      const now = Date.now()
      if (now - lastUpdate.current < 2000) return
      lastUpdate.current = now
      loadTasks(true)
    }
    window.addEventListener('taskUpdated', handleUpdate)
    return () => window.removeEventListener('taskUpdated', handleUpdate)
  }, [token, filter, effectiveProject])

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedTasks((prev) => {
      const copy = new Set(prev)
      if (checked) copy.add(id)
      else copy.delete(id)
      return copy
    })
  }

  // Bulk operations: include token in payload.payload.token
  const handleBulkExecute = async (action: 'delete'|'complete'|'postpone') => {
    if (!selectedTasks.size) return
    if (action === 'postpone') { setShowBulkDate(true); return }
    const ids = Array.from(selectedTasks)
    const payload: any = { action, ids, payload: { token } }
    try {
      await fetch('/api/todoist/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      window.dispatchEvent(new Event('taskUpdated'))
      setSelectedTasks(new Set())
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Wykonano akcję zbiorczą' } }))
    } catch (err) {
      console.error('bulk action err', err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd akcji zbiorczej' } }))
    }
  }

  const handleBulkPostponeConfirm = async () => {
    if (!bulkDate) return window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Wybierz datę' } }))
    const ids = Array.from(selectedTasks)
    const payload: any = { action: 'postpone', ids, payload: { newDate: bulkDate, token } }
    try {
      await fetch('/api/todoist/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      window.dispatchEvent(new Event('taskUpdated'))
      setSelectedTasks(new Set())
      setShowBulkDate(false)
      setBulkDate('')
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Przeniesiono zaznaczone zadania' } }))
    } catch (err) {
      console.error('bulk postpone err', err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd przenoszenia' } }))
    }
  }

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
            {selectedProject == null ? (
              <select value={localSelectedProject} onChange={(e) => setLocalSelectedProject(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700">
                <option value="all">📁 Wszystkie projekty</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>🗂 {p.name}</option>))}
              </select>
            ) : (<div className="text-sm text-gray-600">📁 {projects.find((p) => p.id === selectedProject)?.name || 'Wszystkie projekty'}</div>)}
          </div>
        </div>
      )}

      <div className="relative overflow-visible pb-28">
        <AnimatePresence mode="popLayout">
          {tasks.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-neutral-500 mt-4 text-center">Brak zadań dla tego filtru.</motion.p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <motion.li key={t.id} whileHover={{ scale: 1.01 }} className="cursor-pointer transition rounded-lg hover:bg-gray-50 overflow-visible">
                  <div className="flex items-center gap-3">
                    <div className="flex-1" onClick={() => onOpenTaskChat?.(t)}>
                      <TaskCard
                        task={t}
                        token={token}
                        onAction={() => loadTasks()}
                        selectable
                        selected={selectedTasks.has(t.id)}
                        onSelectChange={(checked) => toggleSelect(t.id, checked)}
                        showContextMenu={showContextMenu}
                        onOpen={onOpenTaskChat}
                      />
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>
      </div>

      {selectedTasks.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border rounded-md shadow-md px-4 py-2 flex items-center gap-3 z-50">
          <div className="text-sm font-medium">{selectedTasks.size} wybranych</div>
          <button onClick={() => handleBulkExecute('postpone')} className="px-3 py-1 bg-blue-600 text-white rounded">Przenieś</button>
          <button onClick={() => handleBulkExecute('complete')} className="px-3 py-1 bg-green-600 text-white rounded">Zakończ</button>
          <button onClick={() => handleBulkExecute('delete')} className="px-3 py-1 bg-red-600 text-white rounded">Usuń</button>
          <button onClick={() => setSelectedTasks(new Set())} className="px-2 py-1 text-sm">Anuluj</button>
        </div>
      )}

      {showBulkDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white p-4 rounded shadow max-w-sm w-full">
            <h3 className="font-semibold mb-2">Przenieś zaznaczone zadania</h3>
            <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className="w-full border p-2 rounded mb-3" />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded bg-gray-100" onClick={() => { setShowBulkDate(false); setBulkDate('') }}>Anuluj</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={handleBulkPostponeConfirm}>Przenieś</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
