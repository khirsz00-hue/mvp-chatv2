'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { parseISO, startOfDay, isSameDay } from 'date-fns'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'
import TaskDialog from './TaskDialog'

export default function TodoistTasksView({
  token,
  onUpdate,
  hideHeader = false,
}: {
  token: string
  onUpdate?: () => void
  hideHeader?: boolean
}) {
  const [filter, setFilter] = useState<
    'today' | 'tomorrow' | 'overdue' | '7 days' | '30 days'
  >(() =>
    typeof window !== 'undefined'
      ? ((localStorage.getItem('todoist_filter') as any) || 'today')
      : 'today'
  )

  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [toast, setToast] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'week'>(() =>
    (typeof window !== 'undefined' && (localStorage.getItem('todoist_filter') === '7 days')) ? 'week' : 'list'
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

  // Robust parser: always return local Date normalized to startOfDay or null.
  const parseDueToLocalDay = (dueRaw: any): Date | null => {
    if (!dueRaw) return null
    const dueStr = typeof dueRaw === 'string' ? dueRaw : dueRaw?.date ?? null
    if (!dueStr) return null

    // date-only 'YYYY-MM-DD' -> construct local date with year/month/day
    const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(dueStr)
    if (dateOnlyMatch) {
      const [y, m, d] = dueStr.split('-').map(Number)
      // new Date(year, monthIndex, day) constructs local date at 00:00 local
      return startOfDay(new Date(y, m - 1, d))
    }

    // otherwise try ISO parse (may include timezone). Use parseISO/new Date and normalize to local startOfDay
    try {
      const parsed = parseISO(dueStr)
      if (!isNaN(parsed.getTime())) return startOfDay(parsed)
      const fallback = new Date(dueStr)
      return isNaN(fallback.getTime()) ? null : startOfDay(fallback)
    } catch {
      const fallback = new Date(dueStr)
      return isNaN(fallback.getTime()) ? null : startOfDay(fallback)
    }
  }

  // fetchProjects
  useEffect(() => {
    if (!token) return
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/todoist/projects?token=${encodeURIComponent(token)}`, {
          headers: { 'x-todoist-token': token },
        })
        const data = await res.json()
        if (Array.isArray(data)) setProjects(data)
        else if (data.projects) setProjects(data.projects)
        else setProjects([])
      } catch (err) {
        console.error('❌ Błąd pobierania projektów:', err)
        setProjects([])
      }
    }
    fetchProjects()
  }, [token])

  const fetchTasks = async () => {
    if (!token) return
    try {
      let filterQuery = ''
      switch (filter) {
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

      const res = await fetch(`/api/todoist/tasks?token=${encodeURIComponent(token)}&filter=${encodeURIComponent(filterQuery)}`)
      const data = await res.json()
      let fetched = data.tasks || []

      // client-side filter by project if selected
      if (selectedProject !== 'all') {
        fetched = fetched.filter((t: any) => t.project_id === selectedProject)
      }

      if (filter === 'today') {
        const todayStart = startOfDay(new Date())
        const overdue = fetched.filter((t: any) => {
          const d = parseDueToLocalDay(t.due)
          return d ? d.getTime() < todayStart.getTime() : false
        })
        const today = fetched.filter((t: any) => {
          const d = parseDueToLocalDay(t.due)
          return d ? isSameDay(d, todayStart) : false
        })
        setTasks([...overdue, ...today])
      } else {
        setTasks(fetched)
      }
    } catch (err) {
      console.error('❌ Błąd pobierania zadań:', err)
    }
  }

  // SSE + Polling
  useEffect(() => {
    if (!token) return
    console.log('🚀 Uruchomiono Todoist listener...')

    let es: EventSource | null = null

    const connectSSE = () => {
      try {
        es = new EventSource('/api/todoist/stream')
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.event?.startsWith('item:')) {
              const now = Date.now()
              if (data.event === 'item:added') {
                setTimeout(fetchTasks, 1500)
              } else if (now - lastEvent.current > 1500) {
                lastEvent.current = now
                fetchTasks()
              }

              const msg =
                data.event === 'item:added'
                  ? '🆕 Dodano zadanie'
                  : data.event === 'item:completed'
                  ? '✅ Ukończono zadanie'
                  : '🔄 Lista zadań zaktualizowana'

              setToast(msg)
              setTimeout(() => setToast(null), 2500)
            }
          } catch {}
        }

        es.onerror = () => {
          es?.close()
          setTimeout(connectSSE, 5000)
        }
      } catch {}
    }

    connectSSE()
    const ping = setInterval(() => fetch('/api/todoist/stream/ping').catch(() => {}), 25000)
    const poll = setInterval(fetchTasks, 45000)
    return () => {
      clearInterval(ping)
      clearInterval(poll)
      es?.close()
    }
  }, [token])

  useEffect(() => {
    fetchTasks()
    setViewMode((f) => (filter === '7 days' ? 'week' : 'list'))
    if (typeof window !== 'undefined') localStorage.setItem('todoist_filter', filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selectedProject, token])

  // ADD TASK: wysyłamy token także w Authorization header (dla pewności)
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // dodajemy header
        },
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
      fetchTasks()
      onUpdate?.()
    } catch (err: any) {
      console.error('create task error', err)
      alert('Błąd dodawania zadania: ' + (err?.message || 'nieznany błąd'))
    }
  }

  // handlers delegowane do WeekView / TodoistTasks
  const handleComplete = async (id: string) => {
    if (!token) return
    try {
      await fetch('/api/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      })
      setToast('✅ Ukończono zadanie')
      setTimeout(() => setToast(null), 2000)
      fetchTasks()
      onUpdate?.()
    } catch (err) {
      console.error('❌ complete error', err)
      setToast('❌ Błąd przy ukończeniu')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const handleMove = async (id: string, newDate: Date) => {
    if (!token) return
    try {
      const dateStr = newDate.toISOString().slice(0, 10)
      await fetch('/api/todoist/postpone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token, newDate: dateStr }),
      })
      setToast('📅 Przeniesiono zadanie')
      setTimeout(() => setToast(null), 2000)
      fetchTasks()
      onUpdate?.()
    } catch (err) {
      console.error('❌ move error', err)
      setToast('❌ Błąd przy przenoszeniu')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      await fetch('/api/todoist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      })
      setToast('🗑 Usunięto zadanie')
      setTimeout(() => setToast(null), 2000)
      fetchTasks()
      onUpdate?.()
    } catch (err) {
      console.error('❌ delete error', err)
      setToast('❌ Błąd przy usuwaniu')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const handleHelp = (task: any) => {
    setToast('🧠 Poproszono o pomoc dla zadania')
    setTimeout(() => setToast(null), 2000)
    setOpenTask({ id: task.id, title: task.content, description: task.description })
  }

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
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key as any)}
                    className={`filter-pill ${filter === f.key ? 'filter-pill--active' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-neutral-900/5 text-sm px-3 py-1.5 rounded-md border border-neutral-200 focus:outline-none"
              >
                <option value="all">📁 Wszystkie projekty</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
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
          <WeekView
            tasks={tasks}
            onMove={(id, newDate) => handleMove(id, newDate)}
            onComplete={(id) => handleComplete(id)}
            onDelete={(id) => handleDelete(id)}
            onHelp={(task) => handleHelp(task)}
          />
        ) : (
          <TodoistTasks
            token={token}
            filter={filter}
            onChangeFilter={setFilter}
            onUpdate={fetchTasks}
            onOpenTaskChat={(t: any) => {
              setOpenTask({ id: t.id, title: t.content, description: t.description })
            }}
            showHeaderFilters={false}
            selectedProject={selectedProject} // <-- pass header selection
          />
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3">Dodaj nowe zadanie</h3>
              <div className="space-y-3">
                <input
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Tytuł zadania"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />

                <textarea
                  className="w-full border px-3 py-2 rounded min-h-[90px]"
                  placeholder="Opis zadania (opcjonalnie)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />

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

      {/* Task detail modal (opened from list/week) */}
      <AnimatePresence>
        {openTask && (
          <TaskDialog
            task={{ id: openTask.id, title: openTask.title }}
            initialTaskData={{ description: openTask.description }}
            mode="task"
            onClose={() => setOpenTask(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
