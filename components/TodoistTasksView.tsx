'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'
import TaskDialog from './TaskDialog'
import TaskCard from './TaskCard'
import { parseDueToLocalYMD } from '../utils/date'
import { appendHistory } from '../utils/localTaskStore'

export default function TodoistTasksView({ token, onUpdate, hideHeader = false }: any) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days' | '30 days'>(() => {
    if (typeof window === 'undefined') return 'today'
    return (localStorage.getItem('todoist_filter') as any) || 'today'
  })

  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [toast, setToast] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'week'>(() => {
    if (typeof window === 'undefined') return 'list'
    return localStorage.getItem('todoist_filter') === '7 days' ? 'week' : 'list'
  })
  const lastLocalAction = useRef<number>(0)

  const [openTask, setOpenTask] = useState<any | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [openMoveSingle, setOpenMoveSingle] = useState<{ open: boolean; id?: string }>({ open: false })

  const refreshFilter = viewMode === 'week' ? '7 days' : filter

  useEffect(() => {
    const toastHandler = (e: any) => {
      const m = e?.detail?.message
      if (m) {
        setToast(m)
        setTimeout(() => setToast(null), 2200)
      }
    }

    const onOpenMovePicker = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      setOpenMoveSingle({ open: true, id: d.id })
    }

    window.addEventListener('appToast', toastHandler)
    window.addEventListener('openMovePicker', onOpenMovePicker)

    return () => {
      window.removeEventListener('appToast', toastHandler)
      window.removeEventListener('openMovePicker', onOpenMovePicker)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    let mounted = true
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/todoist/projects?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (!mounted) return
        if (Array.isArray(data)) setProjects(data)
        else if (data.projects) setProjects(data.projects)
        else setProjects([])
      } catch {
        if (mounted) setProjects([])
      }
    }
    fetchProjects()
    return () => {
      mounted = false
    }
  }, [token])

  const fetchTasks = async (override?: any) => {
    if (!token) return
    try {
      const effective = override ?? filter
      let q = ''
      if (effective === 'today') q = 'today | overdue'
      else if (effective === 'tomorrow') q = 'tomorrow'
      else if (effective === '7 days') q = '7 days'
      else if (effective === '30 days') q = '30 days'
      else if (effective === 'overdue') q = 'overdue'

      const res = await fetch(`/api/todoist/tasks?token=${encodeURIComponent(token)}&filter=${encodeURIComponent(q)}`)
      const data = await res.json()
      let fetched = data.tasks || []
      if (selectedProject !== 'all') fetched = fetched.filter((t: any) => t.project_id === selectedProject)

      const mapped = fetched.map((t: any) => ({
        ...t,
        _dueYmd: parseDueToLocalYMD(t.due),
        created_at: t.added_at || t.date_added || t.created_at || null,
      }))

      setTasks(mapped)
      onUpdate?.(mapped)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchTasks(refreshFilter)
    const poll = setInterval(() => {
      if (viewMode !== 'week') fetchTasks(refreshFilter)
    }, 45000)
    return () => clearInterval(poll)
  }, [token, filter, selectedProject, viewMode])

  const handleCreateTask = async (payload?: any) => {
    if (!token) {
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Brak tokena' } }))
      return
    }
    try {
      const p = payload ?? { content: 'Nowe zadanie', token }
      const res = await fetch('/api/todoist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Błąd')
      if (json?.task) setTasks((prev) => [json.task, ...prev])
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '🆕 Dodano zadanie' } }))
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd dodawania: ' + (err?.message || '') } }))
    }
  }

  const handleComplete = async (id: string) => {
    if (!token) return
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, _completing: true } : t)))
    try {
      await fetch('/api/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      })
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => t.id !== id))
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '✅ Ukończono zadanie' } }))
      }, 220)
    } catch (err) {
      console.error(err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd ukończenia' } }))
      fetchTasks(refreshFilter)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    if (!confirm('Usunąć zadanie?')) return
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, _deleting: true } : t)))
    try {
      await fetch('/api/todoist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      })
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => t.id !== id))
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '🗑 Usunięto zadanie' } }))
      }, 200)
    } catch (err) {
      console.error(err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd usuwania' } }))
      fetchTasks(refreshFilter)
    }
  }

  const handleMove = async (ids: string[], newDateYmd: string) => {
    if (!token) return
    setTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, _movingTo: newDateYmd } : t)))
    try {
      await fetch('/api/todoist/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', ids, newDate: newDateYmd }),
      })
      setTimeout(() => {
        setTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, _dueYmd: newDateYmd } : t)))
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '📅 Przeniesiono zadania' } }))
        setSelectedTasks(new Set())
      }, 200)
    } catch (err) {
      console.error(err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd przeniesienia' } }))
      fetchTasks(refreshFilter)
    } finally {
      setOpenMoveSingle({ open: false })
    }
  }

  const BulkBar = () => {
    const count = selectedTasks.size
    if (count === 0 || filter === '7 days') return null
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-slide-in-up">
        <div className="card p-4 shadow-glow-lg flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-sm font-semibold text-brand-700">Zaznaczono: {count}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setOpenMoveSingle({ open: true })} 
              className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium shadow-soft hover:shadow-soft-lg hover:bg-blue-600 transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Przenieś
            </button>
            <button 
              onClick={() => bulkComplete()} 
              className="px-4 py-2 bg-success-500 text-white rounded-xl text-sm font-medium shadow-soft hover:shadow-soft-lg hover:bg-success-600 transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ukończ
            </button>
            <button 
              onClick={() => bulkDelete()} 
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium shadow-soft hover:shadow-soft-lg hover:bg-red-600 transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Usuń
            </button>
            <button 
              onClick={() => setSelectedTasks(new Set())} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
              title="Anuluj zaznaczenie"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const bulkComplete = async () => {
    const ids = Array.from(selectedTasks)
    if (!ids.length || !token) return
    setTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, _completing: true } : t)))
    try {
      await fetch('/api/todoist/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', ids }),
      })
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => !ids.includes(t.id)))
        setSelectedTasks(new Set())
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '✅ Zakończono wybrane' } }))
      }, 200)
    } catch (err) {
      console.error(err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd bulk complete' } }))
      fetchTasks(refreshFilter)
    }
  }

  const bulkDelete = async () => {
    const ids = Array.from(selectedTasks)
    if (!ids.length || !token) return
    if (!confirm('Usunąć zaznaczone zadania?')) return
    setTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, _deleting: true } : t)))
    try {
      await fetch('/api/todoist/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids }),
      })
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => !ids.includes(t.id)))
        setSelectedTasks(new Set())
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: '🗑 Usunięto zaznaczone' } }))
      }, 200)
    } catch (err) {
      console.error(err)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd bulk delete' } }))
      fetchTasks(refreshFilter)
    }
  }

  const filterLabels = {
    'today': 'Dzisiaj',
    'tomorrow': 'Jutro',
    '7 days': 'Tydzień',
    '30 days': 'Miesiąc',
    'overdue': 'Zaległe'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters and actions */}
      <div className="bg-white/50 backdrop-blur-sm p-4 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['today', 'tomorrow', '7 days', '30 days', 'overdue'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`filter-pill ${filter === k ? 'filter-pill--active' : ''}`}
              >
                {filterLabels[k]}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <select 
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)} 
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Wszystkie projekty</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button 
              onClick={() => handleCreateTask()} 
              className="btn btn-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Dodaj zadanie
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 bg-gradient-to-br from-gray-50 to-white">
        {viewMode === 'week' ? (
          <WeekView
            tasks={tasks}
            onMove={(id: string, ymd: string) => handleMove([id], ymd)}
            onComplete={(id: string) => handleComplete(id)}
            onDelete={(id: string) => handleDelete(id)}
            onHelp={(t: any) => {
              setOpenTask({ id: t.id, title: t.content, description: t.description })
              window.dispatchEvent(new CustomEvent('taskHelp', { detail: { task: t } }))
            }}
            onOpenTask={(t: any) => setOpenTask(t)}
            onAddForDate={(ymd: any) => setOpenTask({ id: '', title: '', description: '', _dueYmd: ymd })}
          />
        ) : filter === '30 days' ? (
          <div>{/* month grouped rendering placeholder */}</div>
        ) : (
          <TodoistTasks
            token={token}
            filter={filter}
            onChangeFilter={(f: any) => setFilter(f)}
            onUpdate={() => fetchTasks(refreshFilter)}
            onOpenTaskChat={(t: any) => setOpenTask({ id: t.id, title: t.content, description: t.description })}
            showHeaderFilters={false}
            selectedProject={selectedProject}
            showContextMenu={false}
            selectable
            selectedTasks={selectedTasks}
            onSelectChange={(id: string, checked: boolean) => {
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

      <BulkBar />

      {openMoveSingle.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpenMoveSingle({ open: false })}>
          <div className="card p-6 max-w-md w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-lg text-gray-900">Przenieś zadanie</h4>
                <p className="text-sm text-gray-500">Wybierz nową datę</p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Data wykonania</label>
              <input 
                type="date" 
                defaultValue={new Date().toISOString().slice(0, 10)} 
                id="move-single-date" 
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button 
                className="btn btn-secondary" 
                onClick={() => setOpenMoveSingle({ open: false })}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const d = (document.getElementById('move-single-date') as HTMLInputElement).value
                  if (!d) return
                  if (openMoveSingle.id) handleMove([openMoveSingle.id], d)
                  else if (selectedTasks.size > 0) handleMove(Array.from(selectedTasks), d)
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Przenieś
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed top-6 right-6 z-60 bg-black text-white px-4 py-2 rounded">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openTask && (
          <TaskDialog
            task={openTask}
            mode="task"
            onClose={() => setOpenTask(null)}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
