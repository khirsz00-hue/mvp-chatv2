'use client'

import React, { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'
import TaskDialog from './TaskDialog'
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
  const [showAdd, setShowAdd] = useState(false)
  const [addDateYmd, setAddDateYmd] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState<string>('')
  const [newProject, setNewProject] = useState<string>('')
  const [newDescription, setNewDescription] = useState<string>('')

  const refreshFilter: FilterType = viewMode === 'week' ? '7 days' : filter

  // global appToast listener to show toasts from components
  useEffect(() => {
    const handler = (e: any) => {
      const msg = e?.detail?.message
      if (msg) {
        setToast(msg)
        setTimeout(() => setToast(null), 2500)
      }
    }
    window.addEventListener('appToast', handler)
    return () => window.removeEventListener('appToast', handler)
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
      const mapped = (fetched as any[]).map((t) => ({ ...t, _dueYmd: parseDueToLocalYMD(t.due) }))

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

  // Create task modal
  const openAddForDate = (ymd?: string | null) => {
    setAddDateYmd(ymd ?? null)
    setNewDate(ymd ?? '')
    setShowAdd(true)
  }

  const handleCreateTask = async () => {
    if (!token) return alert('Brak tokena')
    if (!newTitle.trim()) return alert('Podaj nazwę zadania')
    try {
      const payload: any = { content: newTitle.trim() }
      if (newDate) payload.due = newDate
      if (newProject) payload.project_id = newProject
      if (newDescription) payload.description = newDescription.trim()
      const res = await fetch('/api/todoist/add', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error('Błąd serwera: ' + txt)
      }
      // set created_at locally so dialog can show immediately after opening
      setShowAdd(false)
      setNewTitle(''); setNewDate(''); setNewProject(''); setNewDescription('')
      setToast('🆕 Dodano zadanie')
      setTimeout(() => setToast(null), 1500)
      fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err: any) {
      console.error('create task error', err)
      alert('Błąd dodawania zadania: ' + (err?.message || 'nieznany błąd'))
    }
  }

  const handleComplete = async (id: string) => {
    if (!token) return
    try {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      lastLocalAction.current = Date.now()
      await fetch('/api/todoist/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token }) })
      setToast('✅ Ukończono zadanie')
      setTimeout(() => setToast(null), 1500)
      if (viewMode !== 'week') fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err) { console.error(err); fetchTasks(refreshFilter) }
  }

  const handleMove = async (id: string, newDateYmd: string) => {
    if (!token) return
    try {
      const prev = tasks.find((t) => t.id === id)
      const prevDate = prev?._dueYmd ?? (prev?.due?.date ?? (typeof prev?.due === 'string' ? prev.due : null)) ?? null
      setTasks((prevList) => prevList.map((t) => (t.id === id ? { ...t, _dueYmd: newDateYmd } : t)))
      lastLocalAction.current = Date.now()
      await fetch('/api/todoist/postpone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token, newDate: newDateYmd }) })
      appendHistory(id, prevDate, newDateYmd)
      setToast('📅 Przeniesiono zadanie')
      setTimeout(() => setToast(null), 1500)
      if (viewMode !== 'week') setTimeout(() => fetchTasks(refreshFilter), 700)
      onUpdate?.()
    } catch (err) { console.error(err); fetchTasks(refreshFilter) }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      lastLocalAction.current = Date.now()
      await fetch('/api/todoist/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token }) })
      setToast('🗑 Usunięto zadanie')
      setTimeout(() => setToast(null), 1500)
      if (viewMode !== 'week') fetchTasks(refreshFilter)
      onUpdate?.()
    } catch (err) { console.error(err); fetchTasks(refreshFilter) }
  }

  const handleHelp = (taskObj: any) => {
    setToast('🤖 Poproszono o pomoc dla zadania')
    setTimeout(() => setToast(null), 2000)
    setOpenTask({ id: taskObj.id, title: taskObj.content, description: taskObj.description })
  }

  const renderMonthGrouped = () => {
    // group by _dueYmd (or 'no-date'), sorted ascending
    const groups: Record<string, any[]> = {}
    for (const t of tasks) {
      const k = t._dueYmd || 'no-date'
      groups[k] = groups[k] || []
      groups[k].push(t)
    }
    const keys = Object.keys(groups).filter(k => k !== 'no-date').sort().concat(Object.keys(groups).includes('no-date') ? ['no-date'] : [])
    return (
      <div className="space-y-4">
        {keys.map((k) => (
          <div key={k}>
            <div className="text-sm font-semibold text-gray-600 mb-2">{k === 'no-date' ? 'Brak terminu' : k}</div>
            <ul className="space-y-2">
              {groups[k].map((t) => (
                <li key={t.id}>
                  <div className="p-3 bg-white rounded-lg border shadow-sm flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.content}</div>
                      <div className="text-xs text-gray-500 mt-1">{t.project_name || ''}</div>
                    </div>
                    <div className="ml-2 text-xs text-gray-500">Due: {t._dueYmd || '—'}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
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
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {viewMode === 'week' ? (
          <WeekView tasks={tasks} onMove={(id, ymd) => handleMove(id, ymd)} onComplete={(id) => handleComplete(id)} onDelete={(id) => handleDelete(id)} onHelp={(t) => handleHelp(t)} onOpenTask={(t) => setOpenTask(t)} onAddForDate={(ymd) => openAddForDate(ymd)} />
        ) : filter === '30 days' ? (
          renderMonthGrouped()
        ) : (
          <TodoistTasks token={token} filter={filter} onChangeFilter={setFilter} onUpdate={() => fetchTasks(refreshFilter)} onOpenTaskChat={(t: any) => setOpenTask({ id: t.id, title: t.content, description: t.description })} showHeaderFilters={false} selectedProject={selectedProject} showContextMenu={false} />
        )}
      </div>

      <AnimatePresence>
        {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.2 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-md shadow-md">{toast}</motion.div>}
      </AnimatePresence>

      {/* Add Task modal */}
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
        {openTask && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenTask(null)}>
          <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }} className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <TaskDialog task={{ id: openTask.id, title: openTask.title }} initialTaskData={{ description: openTask.description, project_name: openTask.project_name, project_id: openTask.project_id, due: openTask._dueYmd }} onClose={() => setOpenTask(null)} />
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}
