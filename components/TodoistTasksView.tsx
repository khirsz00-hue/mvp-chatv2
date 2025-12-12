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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-white border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
        <div className="text-sm text-gray-700">Zaznaczono: {count}</div>
        <button onClick={() => setOpenMoveSingle({ open: true })} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm">Przenieś</button>
        <button onClick={() => bulkComplete()} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Ukończ</button>
        <button onClick={() => bulkDelete()} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Usuń</button>
      </div>
    )
  } // ← brakujący nawias domykający tu

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

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center px-3 py-1 rounded bg-green-50 text-green-700">📋 Lista zadań</div>
            <div className="ml-2">
              {['today', 'tomorrow', '7 days', '30 days', 'overdue'].map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k as any)}
                  className={`ml-2 ${filter === k ? 'font-semibold text-violet-600' : 'text-gray-600'}`}
                >
                  {k === '7 days' ? 'Tydzień' : k === '30 days' ? 'Miesiąc' : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="px-3 py-1 border rounded">
              <option value="all">Wszystkie projekty</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={() => handleCreateTask()} className="px-3 py-1 bg-violet-600 text-white rounded">+ Dodaj zadanie</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setOpenMoveSingle({ open: false })}>
          <div className="bg-white p-4 rounded shadow" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold mb-2">Przenieś zadanie</h4>
            <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} id="move-single-date" className="border p-2 rounded mb-3" />
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 bg-gray-100 rounded" onClick={() => setOpenMoveSingle({ open: false })}>Anuluj</button>
              <button className="px-3 py-1 bg-violet-600 text-white rounded" onClick={() => {
                const d = (document.getElementById('move-single-date') as HTMLInputElement).value
                if (!d) return
                if (openMoveSingle.id) handleMove([openMoveSingle.id], d)
              }}>Przenieś</button>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80]">
            <TaskDialog
              task={openTask}
              onClose={() => setOpenTask(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
