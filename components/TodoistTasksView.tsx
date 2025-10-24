'use client'

import React, { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'
import TaskDialog from './TaskDialog'
import TaskCard from './TaskCard'
import { parseDueToLocalYMD, ymdFromDate } from '../utils/date'
import { addDays, startOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { appendHistory } from '../utils/localTaskStore'

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
  const lastLocalAction = useRef<number>(0)

  const [openTask, setOpenTask] = useState<any | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set()) // shared selection for bulk
  const [showAdd, setShowAdd] = useState(false)
  const [addDateYmd, setAddDateYmd] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState<string>('')
  const [newProject, setNewProject] = useState<string>('')
  const [newDescription, setNewDescription] = useState<string>('')

  const refreshFilter: FilterType = viewMode === 'week' ? '7 days' : filter

  useEffect(() => {
    const handler = (e: any) => {
      const msg = e?.detail?.message
      if (msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }
    }
    window.addEventListener('appToast', handler)

    const openFromSub = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      if (d.initialTaskData) {
        setOpenTask({ id: d.id, title: d.title || 'Subtask', initialTaskData: d.initialTaskData, initialIsLocal: !!d.initialIsLocal })
      } else {
        setOpenTask({ id: d.id, title: d.title || 'Subtask' })
      }
    }
    window.addEventListener('openTaskFromSubtask', openFromSub)

    const onTaskSaved = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      setTasks((prev) => prev.map((t) => (t.id === d.id ? { ...t, description: d.description ?? t.description, project_id: d.project_id ?? t.project_id, project_name: d.project_name ?? t.project_name, _dueYmd: d.due ?? t._dueYmd } : t)))
    }
    window.addEventListener('taskSaved', onTaskSaved)

    return () => {
      window.removeEventListener('appToast', handler)
      window.removeEventListener('openTaskFromSubtask', openFromSub)
      window.removeEventListener('taskSaved', onTaskSaved)
    }
  }, [])

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
    return () => { mounted = false }
  }, [token])

  const fetchTasks = async (overrideFilter?: FilterType) => {
    if (!token) return
    try {
      const effectiveFilter = overrideFilter ?? filter
      const ef = effectiveFilter as string
      let filterQuery = ''
      if (ef === 'today') filterQuery = 'today | overdue'
      else if (ef === 'tomorrow') filterQuery = 'tomorrow'
      else if (ef === '7 days') filterQuery = '7 days'
      else if (ef === '30 days') filterQuery = '30 days'
      else if (ef === 'overdue') filterQuery = 'overdue'

      const res = await fetch(`/api/todoist/tasks?token=${encodeURIComponent(token)}&filter=${encodeURIComponent(filterQuery)}`)
      const data = await res.json()
      let fetched = data.tasks || []
      if (selectedProject !== 'all') fetched = fetched.filter((t: any) => t.project_id === selectedProject)
      const mapped = (fetched as any[]).map((t) => ({ ...t, _dueYmd: parseDueToLocalYMD(t.due), created_at: t.added_at || t.date_added || t.created_at || null }))

      if (ef === 'today') {
        const todayYmd = ymdFromDate(new Date())
        const overdue = mapped.filter((t) => (t._dueYmd ? t._dueYmd < todayYmd : false))
        const todayTasks = mapped.filter((t) => (t._dueYmd ? t._dueYmd === todayYmd : false))
        setTasks([...overdue, ...todayTasks])
        return
      }

      if (viewMode === 'week') {
        const today = new Date()
        const weekStart = startOfWeek(today, { weekStartsOn: 1 })
        const weekEnd = addDays(weekStart, 6)
        const ws = ymdFromDate(weekStart)
        const we = ymdFromDate(weekEnd)
        const weekTasks = mapped.filter((t) => !t._dueYmd || (t._dueYmd >= ws && t._dueYmd <= we))
        setTasks(weekTasks)
        return
      }

      if (ef === '30 days') {
        const mStart = startOfMonth(new Date())
        const mEnd = endOfMonth(new Date())
        const ms = ymdFromDate(mStart)
        const me = ymdFromDate(mEnd)
        const monthTasks = mapped.filter((t) => !t._dueYmd || (t._dueYmd >= ms && t._dueYmd <= me))
        setTasks(monthTasks)
        return
      }

      setTasks(mapped)
    } catch (err) {
      console.error('Błąd pobierania zadań:', err)
    }
  }

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
              if (now - lastLocalAction.current < 2000) return
              if (viewMode === 'week') {
                const msg = data.event === 'item:added' ? '🔕 Dodano zadanie (aktualizacja w tle)' : data.event === 'item:completed' ? '✅ Ukończono zadanie (aktualizacja w tle)' : '🔄 Lista zadań zaktualizowana (w tle)'
                setToast(msg)
                setTimeout(() => setToast(null), 1800)
                return
              }
              if (data.event === 'item:added') setTimeout(() => fetchTasks(refreshFilter), 1500)
              else if (now - lastEvent.current > 1500) { lastEvent.current = now; fetchTasks(refreshFilter) }
            }
          } catch (e) {}
        }
        es.onerror = () => { es?.close(); es = null }
      } catch {}
    }
    connect()
    const poll = setInterval(() => { if (viewMode !== 'week') fetchTasks(refreshFilter) }, 45000)
    fetchTasks(refreshFilter)
    return () => { mounted = false; es?.close(); clearInterval(poll) }
  }, [token, filter, selectedProject, viewMode])

  useEffect(() => {
    setViewMode(filter === '7 days' ? 'week' : 'list')
    if (typeof window !== 'undefined') localStorage.setItem('todoist_filter', filter)
    if (filter === '7 days') { setTasks([]); fetchTasks('7 days') }
    else if (filter === '30 days') { setTasks([]); fetchTasks('30 days') }
  }, [filter])

  // Bulk actions (list views only)
  const bulkComplete = async () => {
    if (!token) return
    const ids = Array.from(selectedTasks)
    if (!ids.length) return
    try {
      // optimistic UI
      setTasks((prev) => prev.filter((t) => !selectedTasks.has(t.id)))
      setSelectedTasks(new Set())
      await fetch('/api/todoist/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', ids }) })
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '✅ Zakończono wybrane' } }))
      fetchTasks(refreshFilter)
    } catch (err) {
      console.error(err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd bulk complete' } }))
      fetchTasks(refreshFilter)
    }
  }
  const bulkDelete = async () => {
    if (!token) return
    const ids = Array.from(selectedTasks)
    if (!ids.length) return
    if (!confirm('Usunąć zaznaczone zadania?')) return
    try {
      setTasks((prev) => prev.filter((t) => !selectedTasks.has(t.id)))
      setSelectedTasks(new Set())
      await fetch('/api/todoist/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', ids }) })
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '🗑 Usunięto zaznaczone' } }))
      fetchTasks(refreshFilter)
    } catch (err) {
      console.error(err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd bulk delete' } }))
      fetchTasks(refreshFilter)
    }
  }

  const openAddForDate = (ymd?: string | null) => {
    setAddDateYmd(ymd ?? null)
    setNewDate(ymd ?? '')
    setShowAdd(true)
  }

  const handleOpenTask = (task: any) => {
    setOpenTask({ id: task.id, title: task.content, description: task.description })
  }

  const handleMove = async (id: string, ymd: string) => {
    if (!token) return
    lastLocalAction.current = Date.now()
    try {
      await fetch('/api/todoist/postpone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token, newDate: ymd }),
      })
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '✅ Przeniesiono zadanie' } }))
      fetchTasks(refreshFilter)
    } catch (err) {
      console.error('move error', err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd przesunięcia' } }))
    }
  }

  const handleComplete = async (id: string) => {
    if (!token) return
    lastLocalAction.current = Date.now()
    try {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      await fetch('/api/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      })
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '✅ Ukończono zadanie' } }))
      fetchTasks(refreshFilter)
    } catch (err) {
      console.error('complete error', err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd ukończenia' } }))
      fetchTasks(refreshFilter)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    if (!confirm('Usunąć zadanie?')) return
    lastLocalAction.current = Date.now()
    try {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      await fetch('/api/todoist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      })
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '🗑 Usunięto zadanie' } }))
      fetchTasks(refreshFilter)
    } catch (err) {
      console.error('delete error', err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd usuwania' } }))
      fetchTasks(refreshFilter)
    }
  }

  const handleHelp = (task: any) => {
    const detail = { task: { id: task.id, title: task.content, description: task.description } }
    window.dispatchEvent(new CustomEvent('taskHelp', { detail }))
  }

  const handleAddTask = async () => {
    if (!newTitle.trim()) {
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Podaj tytuł zadania' } }))
      return
    }
    try {
      const payload: any = { content: newTitle, token }
      if (newDescription) payload.description = newDescription
      if (newDate) payload.due_date = newDate
      if (newProject && newProject !== 'all') payload.project_id = newProject
      else if (addDateYmd) payload.due_date = addDateYmd

      const res = await fetch('/api/todoist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Błąd dodawania zadania')
      
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '✅ Dodano zadanie' } }))
      setShowAdd(false)
      setNewTitle('')
      setNewDescription('')
      setNewDate('')
      setNewProject('')
      setAddDateYmd(null)
      fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err) {
      console.error('add task error', err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd dodawania zadania' } }))
    }
  }

  // month grouped rendering - badge inline near date
  const renderMonthGrouped = () => {
    const groups: Record<string, any[]> = {}
    for (const t of tasks) {
      const k = t._dueYmd || 'no-date'
      groups[k] = groups[k] || []
      groups[k].push(t)
    }
    const keys = Object.keys(groups).filter(k => k !== 'no-date').sort().concat(Object.keys(groups).includes('no-date') ? ['no-date'] : [])
    const today = new Date()
    return (
      <div className="space-y-4">
        {keys.map((k) => {
          const daysTo = k === 'no-date' ? null : Math.ceil((new Date(k).getTime() - today.getTime()) / 86400000)
          return (
            <div key={k}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-600">{k === 'no-date' ? 'Brak terminu' : k}</div>
                <div>
                  {k !== 'no-date' && (
                    <div className={`inline-flex items-center gap-2 text-xs px-2 py-0.5 rounded ${daysTo !== null && daysTo <= 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                      <span>{daysTo !== null ? (daysTo === 0 ? 'dzisiaj' : `za ${daysTo}d`) : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              <ul className="space-y-2">
                {groups[k].map((t) => (
                  <li key={t.id}>
                    <div className="p-3 bg-white rounded-lg border shadow-sm flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <TaskCard task={t} token={token} selectable onSelectChange={(checked) => {
                          setSelectedTasks((prev) => {
                            const copy = new Set(prev)
                            if (checked) copy.add(t.id)
                            else copy.delete(t.id)
                            return copy
                          })
                        }} selected={selectedTasks.has(t.id)} onOpen={handleOpenTask} wrapTitle={false} showContextMenu={false} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    )
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
                  <button key={f.key} onClick={() => setFilter(f.key as FilterType)} className={`filter-pill ${filter === f.key ? 'filter-pill--active' : ''}`}>{f.label}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="bg-neutral-50 text-sm px-3 py-1.5 rounded-md border border-neutral-200">
                <option value="all">📁 Wszystkie projekty</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <button onClick={() => openAddForDate(null)} className="px-3 py-1.5 bg-violet-600 text-white rounded-md text-sm shadow-sm">+ Dodaj zadanie</button>

              <div className="text-sm text-green-600 font-medium">🟢 Połączono z Todoist</div>
            </div>
          </div>

          {/* Bulk actions for list-like views */}
          { (filter !== '7 days') && selectedTasks.size > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="text-sm text-gray-700">Zaznaczono: {selectedTasks.size}</div>
              <button onClick={bulkComplete} className="px-3 py-1 text-sm bg-green-600 text-white rounded">Ukończ</button>
              <button onClick={bulkDelete} className="px-3 py-1 text-sm bg-red-600 text-white rounded">Usuń</button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {viewMode === 'week' ? (
          <WeekView tasks={tasks} onMove={(id, ymd) => handleMove(id, ymd)} onComplete={(id) => handleComplete(id)} onDelete={(id) => handleDelete(id)} onHelp={(t) => handleHelp(t)} onOpenTask={(t) => setOpenTask(t)} onAddForDate={(ymd) => openAddForDate(ymd)} />
        ) : filter === '30 days' ? (
          renderMonthGrouped()
        ) : (
          <TodoistTasks 
            token={token} 
            filter={filter} 
            onChangeFilter={setFilter} 
            onUpdate={() => fetchTasks(refreshFilter)} 
            onOpenTaskChat={(t: any) => setOpenTask({ id: t.id, title: t.content, description: t.description })} 
            showHeaderFilters={false} 
            selectedProject={selectedProject} 
            showContextMenu={false}
            selectedTasks={selectedTasks}
            onSelectChange={(id, checked) => {
              setSelectedTasks((prev) => {
                const copy = new Set(prev)
                if (checked) copy.add(id)
                else copy.delete(id)
                return copy
              })
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.2 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-md shadow-md">{toast}</motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {openTask && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenTask(null)}>
          <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }} className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <TaskDialog token={token} task={{ id: openTask.id, title: openTask.title }} initialTaskData={openTask.initialTaskData} initialIsLocal={openTask.initialIsLocal} onClose={() => { setOpenTask(null); fetchTasks(refreshFilter) }} />
          </motion.div>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
          <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }} className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Dodaj nowe zadanie</h3>
            <div>
              <label className="text-sm text-gray-700 block mb-1">Tytuł *</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Tytuł zadania" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-gray-700 block mb-1">Opis</label>
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Opis zadania" className="w-full border rounded px-3 py-2 min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700 block mb-1">Data</label>
                <input type="date" value={newDate || addDateYmd || ''} onChange={(e) => setNewDate(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-700 block mb-1">Projekt</label>
                <select value={newProject} onChange={(e) => setNewProject(e.target.value)} className="w-full border rounded px-3 py-2">
                  <option value="">Domyślny</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 rounded">Anuluj</button>
              <button onClick={handleAddTask} className="px-4 py-2 bg-violet-600 text-white rounded">Dodaj</button>
            </div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}
