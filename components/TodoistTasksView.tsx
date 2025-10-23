'use client'

import React, { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'
import TaskDialog from './TaskDialog'
import { parseDueToLocalYMD, ymdFromDate, daysUntil } from '../utils/date'

type FilterType = 'today' | 'tomorrow' | 'overdue' | '7 days' | '30 days'

export default function TodoistTasksView({
  token,
  onUpdate,
  hideHeader = false,
}: {
  token: string
  onUpdate?: () => void
  hideHeader?: boolean
}): JSX.Element {
  const [filter, setFilter] = useState<FilterType>(() =>
    typeof window !== 'undefined' ? ((localStorage.getItem('todoist_filter') as any) || 'today') : 'today'
  )

  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [toast, setToast] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'week'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('todoist_filter') === '7 days' ? 'week' : 'list'
  )
  const lastEvent = useRef<number>(0)

  // Add task modal state
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState<string>('')
  const [newProject, setNewProject] = useState<string>('')
  const [newDescription, setNewDescription] = useState<string>('')

  // Modal for viewing a single task (opened from list or week)
  const [openTask, setOpenTask] = useState<any | null>(null)

  // compute refreshFilter once per render to avoid inline ternaries in JSX props
  const refreshFilter: FilterType = viewMode === 'week' ? '7 days' : filter

  // ---- Fetch projects ----
  useEffect(() => {
    if (!token) return
    let mounted = true
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/todoist/projects?token=${encodeURIComponent(token)}`, {
          headers: { 'x-todoist-token': token },
        })
        const data = await res.json()
        if (!mounted) return
        if (Array.isArray(data)) setProjects(data)
        else if (data.projects) setProjects(data.projects)
        else setProjects([])
      } catch (err) {
        console.error('Błąd pobierania projektów', err)
        if (mounted) setProjects([])
      }
    }
    fetchProjects()
    return () => {
      mounted = false
    }
  }, [token])

  // ---- Fetch tasks (supports override filter) ----
  const fetchTasks = async (overrideFilter?: FilterType) => {
    if (!token) return
    try {
      const effectiveFilter = overrideFilter ?? filter
      let filterQuery = ''
      switch (effectiveFilter) {
        case 'today':
          filterQuery = 'today | overdue'
          break
        case 'tomorrow':
          filterQuery = 'tomorrow'
          break
        case '7 days':
          filterQuery = '7 days'
          break
        case '30 days':
          filterQuery = '30 days'
          break
        case 'overdue':
          filterQuery = 'overdue'
          break
      }

      const res = await fetch(
        `/api/todoist/tasks?token=${encodeURIComponent(token)}&filter=${encodeURIComponent(filterQuery)}`
      )
      const data = await res.json()
      let fetched = data.tasks || []

      // client-side project filter
      if (selectedProject !== 'all') {
        fetched = fetched.filter((t: any) => t.project_id === selectedProject)
      }

      // normalize / add _dueYmd to each task for consistent comparisons
      const mapped = (fetched as any[]).map((t) => {
        const _dueYmd = parseDueToLocalYMD(t.due)
        return { ...t, _dueYmd }
      })

      // If list filter "today": keep overdue + today
      if (effectiveFilter === 'today') {
        const todayYmd = ymdFromDate(new Date())
        const overdue = mapped.filter((t) => (t._dueYmd ? t._dueYmd < todayYmd : false))
        const todayTasks = mapped.filter((t) => (t._dueYmd ? t._dueYmd === todayYmd : false))
        setTasks([...overdue, ...todayTasks])
        return
      }

      // If currently in week view - show tasks for next 7 days and tasks without due
      if (viewMode === 'week') {
        const today = new Date()
        const in7 = new Date(today)
        in7.setDate(today.getDate() + 7)
        const in7Ymd = ymdFromDate(in7)
        const todayYmd = ymdFromDate(today)
        const weekTasks = mapped.filter((t) => {
          if (!t._dueYmd) return true // include tasks without due so they don't disappear
          return t._dueYmd >= todayYmd && t._dueYmd <= in7Ymd
        })
        setTasks(weekTasks)
        return
      }

      // default: set all mapped tasks for other filters
      setTasks(mapped)
    } catch (err) {
      console.error('Błąd pobierania zadań:', err)
    }
  }

  // SSE + polling: EventSource try + polling fallback. Poll uses refreshFilter computed above.
  useEffect(() => {
    if (!token) return
    let es: EventSource | null = null
    let mounted = true

    const connect = () => {
      try {
        es = new EventSource('/api/todoist/stream')
        es.onmessage = (event) => {
          if (!mounted) return
          try {
            const data = JSON.parse(event.data)
            if (data.event?.startsWith('item:')) {
              const now = Date.now()
              if (data.event === 'item:added') {
                setTimeout(() => fetchTasks(refreshFilter), 1500)
              } else if (now - lastEvent.current > 1500) {
                lastEvent.current = now
                fetchTasks(refreshFilter)
              }
              const msg =
                data.event === 'item:added'
                  ? '🔕 Dodano zadanie'
                  : data.event === 'item:completed'
                  ? '✅ Ukończono zadanie'
                  : '🔄 Lista zadań zaktualizowana'
              setToast(msg)
              setTimeout(() => setToast(null), 2000)
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        es.onerror = () => {
          es?.close()
          es = null
        }
      } catch {
        es = null
      }
    }

    connect()
    const poll = setInterval(() => fetchTasks(refreshFilter), 45000)
    // initial fetch
    fetchTasks(refreshFilter)

    return () => {
      mounted = false
      es?.close()
      clearInterval(poll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filter, selectedProject, viewMode])

  useEffect(() => {
    setViewMode(filter === '7 days' ? 'week' : 'list')
    if (typeof window !== 'undefined') localStorage.setItem('todoist_filter', filter)
  }, [filter])

  // ---- Add task ----
  const handleCreateTask = async () => {
    if (!token) return alert('Brak tokena')
    if (!newTitle.trim()) return alert('Podaj nazwę zadania')
    try {
      const payload: any = { content: newTitle.trim() }
      if (newDate) payload.due = newDate
      if (newProject) payload.project_id = newProject
      if (newDescription) payload.description = newDescription.trim()

      const res = await fetch('/api/todoist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error('Błąd serwera: ' + txt)
      }

      setShowAdd(false)
      setNewTitle('')
      setNewDate('')
      setNewProject('')
      setNewDescription('')
      setToast('🆕 Dodano zadanie')
      setTimeout(() => setToast(null), 2000)
      fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err: any) {
      console.error('create task error', err)
      alert('Błąd dodawania zadania: ' + (err?.message || 'nieznany błąd'))
    }
  }

  // handlers passed to WeekView to refresh properly
  const handleComplete = async (id: string) => {
    if (!token) return
    try {
      await fetch('/api/todoist/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token }) })
      setToast('✅ Ukończono zadanie')
      setTimeout(() => setToast(null), 1500)
      fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err) {
      console.error(err)
    }
  }

  // NOTE: handleMove now receives newDateYmd string (yyyy-mm-dd)
  const handleMove = async (id: string, newDateYmd: string) => {
    if (!token) return
    try {
      // send date string directly (date-only) to backend
      await fetch('/api/todoist/postpone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token, newDate: newDateYmd }) })
      setToast('📅 Przeniesiono zadanie')
      setTimeout(() => setToast(null), 1500)
      fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      await fetch('/api/todoist/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token }) })
      setToast('🗑 Usunięto zadanie')
      setTimeout(() => setToast(null), 1500)
      fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err) {
      console.error(err)
    }
  }

  const handleHelp = (taskObj: any) => {
    setToast('🤖 Poproszono o pomoc dla zadania')
    setTimeout(() => setToast(null), 2000)
    // Open TaskDialog by default when user explicitly requests details; for help use event
    setOpenTask({ id: taskObj.id, title: taskObj.content, description: taskObj.description })
  }

  // ---- Render ----
  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-b-xl overflow-hidden relative w-full">
      {!hideHeader && (
        <div className="bg-white rounded-md p-3 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-50 text-green-700 border border-green-100">
                <span className="text-sm font-medium">📋 Lista zadań</span>
              </div>

              <div className="filter-bar ml-1">
                {[
                  { key: 'today', label: 'Dziś' },
                  { key: 'tomorrow', label: 'Jutro' },
                  { key: '7 days', label: 'Tydzień' },
                  { key: '30 days', label: 'Miesiąc' },
                  { key: 'overdue', label: 'Przeterminowane' },
                ].map((f) => (
                  <button key={f.key} onClick={() => setFilter(f.key as FilterType)} className={`filter-pill ${filter === f.key ? 'filter-pill--active' : ''}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="bg-neutral-50 text-sm px-3 py-1.5 rounded-md border border-neutral-200">
                <option value="all">📁 Wszystkie projekty</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 bg-violet-600 text-white rounded-md text-sm shadow-sm">
                + Dodaj zadanie
              </button>

              <div className="text-sm text-green-600 font-medium">🟢 Połączono z Todoist</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {viewMode === 'week' ? (
          <WeekView tasks={tasks} onMove={(id, ymd) => handleMove(id, ymd)} onComplete={(id) => handleComplete(id)} onDelete={(id) => handleDelete(id)} onHelp={(t) => handleHelp(t)} />
        ) : (
          <TodoistTasks
            token={token}
            filter={filter}
            onChangeFilter={setFilter}
            onUpdate={() => fetchTasks(refreshFilter)}
            onOpenTaskChat={(t: any) => setOpenTask({ id: t.id, title: t.content, description: t.description })}
            showHeaderFilters={true}                // <-- PRZYWRÓCONO: list mode shows header filters so you can switch to 'Tydzień'
            selectedProject={selectedProject}
            showContextMenu={false} // LIST MODE: do not show context menu on TaskCard
          />
        )}
      </div>

      <AnimatePresence>
        {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.2 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-md shadow-md">{toast}</motion.div>}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }} className="bg-white rounded-lg shadow-xl w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-3">Dodaj nowe zadanie</h3>
              <div className="space-y-3">
                <input className="w-full border px-3 py-2 rounded" placeholder="Tytuł zadania" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <textarea className="w-full border px-3 py-2 rounded min-h-[90px]" placeholder="Opis zadania (opcjonalnie)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                <div className="flex gap-2">
                  <input type="date" className="border px-3 py-2 rounded" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  <select className="border px-3 py-2 rounded flex-1" value={newProject} onChange={(e) => setNewProject(e.target.value)}>
                    <option value="">Brak projektu</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-3 py-2 rounded bg-gray-100" onClick={() => setShowAdd(false)}>Anuluj</button>
                  <button className="px-4 py-2 rounded bg-violet-600 text-white" onClick={handleCreateTask}>Dodaj</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task detail modal */}
      <AnimatePresence>
        {openTask && <TaskDialog task={{ id: openTask.id, title: openTask.title }} initialTaskData={{ description: openTask.description }} mode="task" onClose={() => setOpenTask(null)} />}
      </AnimatePresence>
    </div>
  )
}
