'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatISO, addDays, isBefore, parseISO, isToday, isTomorrow } from 'date-fns'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'

export default function TodoistTasksView({
  token,
  onUpdate,
}: {
  token: string
  onUpdate?: () => void
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
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list')
  const lastEvent = useRef<number>(0)

  // === 🔁 Pobieranie projektów (dynamiczne z Todoist) ===
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

  // === 🔁 Pobieranie zadań z Todoista ===
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

      const res = await fetch(`/api/todoist/tasks?filter=${encodeURIComponent(filterQuery)}`, {
        headers: { 'x-todoist-token': token },
      })
      const data = await res.json()

      let fetched = data.tasks || []

      // 📁 Filtr po projekcie
      if (selectedProject !== 'all') {
        fetched = fetched.filter((t: any) => t.project_id === selectedProject)
      }

      // 🧩 W filtrze "Dziś" — osobno przeterminowane
      if (filter === 'today') {
        const overdue = fetched.filter(
          (t: any) => t.due?.date && isBefore(parseISO(t.due.date), new Date())
        )
        const today = fetched.filter(
          (t: any) => t.due?.date && isToday(parseISO(t.due.date))
        )
        setTasks([...overdue, ...today])
      } else {
        setTasks(fetched)
      }
    } catch (err) {
      console.error('❌ Błąd pobierania zadań:', err)
    }
  }

  // 🔁 SSE + Webhook + Polling (bez zmian)
  useEffect(() => {
    if (!token) return
    console.log('🚀 Uruchomiono Todoist listener...')

    let es: EventSource | null = null
    let lastWebhookTime = 0

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

  // 📦 Odświeżanie przy zmianie filtra lub projektu
  useEffect(() => {
    fetchTasks()
  }, [filter, selectedProject])

  // === ⚡ Główny widok ===
  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-b-xl overflow-hidden relative">
      {/* === 🔘 Pasek filtrów i projektów === */}
      <div className="flex flex-wrap justify-between items-center px-4 py-3 border-b bg-neutral-900 text-white shadow-sm gap-2">
        {/* 🔹 Filtry czasowe */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'today', label: 'Dziś' },
            { key: 'tomorrow', label: 'Jutro' },
            { key: '7 days', label: 'Tydzień' },
            { key: '30 days', label: 'Miesiąc' },
            { key: 'overdue', label: 'Przeterminowane' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key as any)
                setViewMode(f.key === '7 days' ? 'week' : 'list')
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-gray-200 hover:bg-neutral-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 🔸 Projekty + przełącznik widoku */}
        <div className="flex items-center gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-neutral-800 text-white text-sm px-3 py-1.5 rounded-md border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">📁 Wszystkie projekty</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'week' : 'list')}
            className="text-sm bg-neutral-800 text-gray-200 px-3 py-1.5 rounded-md hover:bg-neutral-700"
          >
            {viewMode === 'list' ? '📅 Widok tygodnia' : '📋 Lista zadań'}
          </button>
        </div>
      </div>

      {/* === 📋 Zawartość główna === */}
      <div className="flex-1 overflow-y-auto p-3">
        {viewMode === 'week' ? (
          <WeekView
            tasks={tasks}
            onMove={(id, newDate) => {
              console.log(`📆 Przenoszę zadanie ${id} → ${formatISO(newDate)}`)
              // TODO: wywołaj endpoint Todoist do zmiany daty (PATCH /tasks/:id)
            }}
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

      {/* 🔔 Toast */}
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
