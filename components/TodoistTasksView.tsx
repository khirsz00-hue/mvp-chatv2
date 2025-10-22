'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatISO, isBefore, parseISO, isToday } from 'date-fns'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'

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

  // helper — bezpieczne pobranie daty z t.due (obsługa string lub { date })
  const getDueDate = (t: any): Date | null => {
    const dueStr = typeof t.due === 'string' ? t.due : t.due?.date ?? null
    if (!dueStr) return null
    try {
      const d = parseISO(dueStr)
      return isNaN(d.getTime()) ? new Date(dueStr) : d
    } catch {
      const dx = new Date(dueStr)
      return isNaN(dx.getTime()) ? null : dx
    }
  }

  // fetchProjects
  useEffect(() => {
    if (!token) return
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/todoist/projects', {
          headers: { 'x-todoist-token': token },
        })
        const data = await res.json()
        if (data.projects) setProjects(data.projects)
      } catch (err) {
        console.error('❌ Błąd pobierania projektów:', err)
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

      const res = await fetch(`/api/todoist/tasks?token=${token}&filter=${encodeURIComponent(filterQuery)}`)
      const data = await res.json()
      let fetched = data.tasks || []

      if (selectedProject !== 'all') {
        fetched = fetched.filter((t: any) => t.project_id === selectedProject)
      }

      if (filter === 'today') {
        const overdue = fetched.filter((t: any) => {
          const d = getDueDate(t)
          return d ? isBefore(d, new Date()) : false
        })
        const today = fetched.filter((t: any) => {
          const d = getDueDate(t)
          return d ? isToday(d) : false
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
    // when filter changes, set viewMode: '7 days' -> week otherwise list
    setViewMode((f) => (filter === '7 days' ? 'week' : 'list'))
    if (typeof window !== 'undefined') localStorage.setItem('todoist_filter', filter)
  }, [filter, selectedProject])

  // --- HANDLERY: complete / move / delete / help ---
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
      // format YYYY-MM-DD (server expects newDate string)
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
    console.log('Pomóż mi dla', task)
    setToast('🧠 Poproszono o pomoc dla zadania')
    setTimeout(() => setToast(null), 2000)
  }

  // === Widok ===
  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-b-xl overflow-hidden relative w-full">
      {/* header */}
      {!hideHeader && (
        <div className="bg-white rounded-md p-3 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-50 text-green-700 border border-green-100">
                <span className="text-sm font-medium">📋 Lista zadań</span>
              </div>

              {/* filtr - prosty pill bar */}
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
    </div>
  )
}
