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
  const lastLocalAction = useRef<number>(0) // track recent local moves to avoid race with polling/ES

  // fetch control refs to avoid races and out-of-order writes
  const fetchSeqRef = useRef(0)
  const fetchInProgress = useRef(false)
  const pendingFetch = useRef(false)

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
    // Coalesce / sequence protection:
    if (fetchInProgress.current) {
      // mark that another fetch should run after current completes
      pendingFetch.current = true
      return
    }

    fetchInProgress.current = true
    const mySeq = ++fetchSeqRef.current // increment seq for this fetch

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

      // apply result only if this is still the latest fetch
      if (mySeq === fetchSeqRef.current) {
        // If list filter "today": keep overdue + today
        if (effectiveFilter === 'today') {
          const todayYmd = ymdFromDate(new Date())
          const overdue = mapped.filter((t) => (t._dueYmd ? t._dueYmd < todayYmd : false))
          const todayTasks = mapped.filter((t) => (t._dueYmd ? t._dueYmd === todayYmd : false))
          setTasks([...overdue, ...todayTasks])
        } else if (viewMode === 'week') {
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
        } else {
          setTasks(mapped)
        }
      } else {
        // outdated response - ignore
      }
    } catch (err) {
      console.error('Błąd pobierania zadań:', err)
    } finally {
      fetchInProgress.current = false
      if (pendingFetch.current) {
        pendingFetch.current = false
        // run a fresh fetch (ensure latest filter/view)
        setTimeout(() => fetchTasks(undefined), 50)
      }
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
              // If we recently performed a local action (move/delete/complete), skip one immediate overwrite to avoid race
              if (now - lastLocalAction.current < 2000) {
                return
              }

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
    const poll = setInterval(() => {
      // also skip polling right after local action
      if (Date.now() - lastLocalAction.current < 1500) return
      fetchTasks(refreshFilter)
    }, 45000)
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
      // optimistic removal from local week list
      setTasks((prev) => prev.filter((t) => t.id !== id))
      lastLocalAction.current = Date.now()

      await fetch('/api/todoist/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token }) })
      setToast('✅ Ukończono zadanie')
      setTimeout(() => setToast(null), 1500)
      fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err) {
      console.error(err)
      // rollback by refetch
      fetchTasks(refreshFilter)
    }
  }

  // NOTE: handleMove now receives newDateYmd string (yyyy-mm-dd) and performs optimistic update
  const handleMove = async (id: string, newDateYmd: string) => {
    if (!token) return
    try {
      // optimistic update: update local tasks so UI reflects move immediately
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, _dueYmd: newDateYmd } : t)))
      lastLocalAction.current = Date.now()

      // send date string directly (date-only) to backend
      await fetch('/api/todoist/postpone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token, newDate: newDateYmd }) })
      setToast('📅 Przeniesiono zadanie')
      setTimeout(() => setToast(null), 1500)

      // delay slightly to give backend time to settle before full refetch
      setTimeout(() => fetchTasks(refreshFilter), 700)
      onUpdate?.()
    } catch (err) {
      console.error(err)
      // rollback by refetch if error
      fetchTasks(refreshFilter)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      // optimistic removal
      setTasks((prev) => prev.filter((t) => t.id !== id))
      lastLocalAction.current = Date.now()

      await fetch('/api/todoist/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token }) })
      setToast('🗑 Usunięto zadanie')
      setTimeout(() => setToast(null), 1500)
      fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err) {
      console.error(err)
      fetchTasks(refreshFilter)
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
      <div className="text-center py-3 border-b border-gray-200 bg-white shadow-sm mb-3">
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
          {/* show week range */}
          {/* compute weekStart again for header */}
          {new Date().toLocaleDateString()}
        </h2>
      </div>

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
            showHeaderFilters={true}                // list mode shows header filters so you can switch to 'Tydzień'
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
