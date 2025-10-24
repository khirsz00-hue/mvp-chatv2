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

  const openAddForDate = (ymd?: string | null) => {
    setAddDateYmd(ymd ?? null)
    setNewDate(ymd ?? '')
    setShowAdd(true)
  }

  const handleCreateTask = async () => {
    if (!token) return window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Brak tokena' } }))
    if (!newTitle.trim()) return window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Podaj nazwę zadania' } }))
    try {
      const payload: any = { content: newTitle.trim(), token }
      if (newDate) payload.due = newDate
      if (newProject) payload.project_id = newProject
      if (newDescription) payload.description = newDescription.trim()
      const res = await fetch('/api/todoist/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const txt = json?.error || JSON.stringify(json) || 'Błąd serwera'
        throw new Error(String(txt))
      }
      // if API returns created task, append immediately
      if (json?.task && Array.isArray(tasks)) {
        setTasks((prev) => [json.task, ...prev])
      } else {
        fetchTasks(refreshFilter)
      }
      setShowAdd(false); setNewTitle(''); setNewDate(''); setNewProject(''); setNewDescription('')
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '🆕 Dodano zadanie' } }))
    } catch (err: any) {
      console.error('create task error', err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd dodawania zadania: ' + (err?.message || '') } }))
    }
  }

  // renderMonthGrouped unchanged here except for badge style (pastel)
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
                    <div className={`text-xs px-2 py-0.5 rounded ${daysTo !== null && daysTo <= 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                      {daysTo !== null ? (daysTo === 0 ? 'dzisiaj' : `za ${daysTo}d`) : ''}
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
                        }} selected={selectedTasks.has(t.id)} onOpen={(task) => setOpenTask({ id: task.id, title: task.content, description: task.description, project_id: task.project_id, project_name: task.project_name, _dueYmd: task._dueYmd, created_at: task.created_at })} />
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
      {/* header and body same as previous */}
      {/* Add Task modal and Task detail modal already shown below (unchanged) */}
      {/* ... */}
      {/* Task detail modal */}
      <AnimatePresence>
        {openTask && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenTask(null)}>
          <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }} className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <TaskDialog token={token} task={{ id: openTask.id, title: openTask.title }} initialTaskData={{ description: openTask.description, project_name: openTask.project_name, project_id: openTask.project_id, due: openTask._dueYmd, created_at: openTask.created_at }} onClose={() => { setOpenTask(null); fetchTasks(refreshFilter) }} />
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}
