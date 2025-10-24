'use client'

import React, { useEffect, useState } from 'react'
import { parseDueToLocalYMD } from '../utils/date'
import { getEstimate, setEstimate, getHistory } from '../utils/localTaskStore'

// Helper: parse "30m", "2h", "90" => minutes (integer)
function parseEstimateToMinutes(input: string): number | null {
  if (!input) return null
  const s = String(input).trim().toLowerCase()
  // formats: "30m", "2h", "1h30m", "90"
  const hMatch = s.match(/(\d+(?:[\.,]\d+)?)h/)
  const mMatch = s.match(/(\d+(?:[\.,]\d+)?)m/)
  let minutes = 0
  if (hMatch) {
    minutes += Math.round(parseFloat(hMatch[1].replace(',', '.')) * 60)
  }
  if (mMatch) {
    minutes += Math.round(parseFloat(mMatch[1].replace(',', '.')))
  }
  if (!hMatch && !mMatch) {
    // numeric plain minutes
    const n = parseInt(s.replace(/[^\d]/g, ''), 10)
    if (!isNaN(n)) minutes = n
  }
  return minutes || null
}

function minutesToLabel(mins?: number | null) {
  if (!mins && mins !== 0) return ''
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function TaskDialog({
  task,
  initialTaskData,
  mode = 'task',
  onClose,
}: {
  task: { id: string; title?: string }
  initialTaskData?: { description?: string; project_name?: string; project_id?: string; due?: any; created_at?: any }
  mode?: 'task' | 'other'
  onClose?: () => void
}) {
  const [data, setData] = useState<any>({
    title: task.title || '',
    description: initialTaskData?.description || '',
    project_id: initialTaskData?.project_id || initialTaskData?.project_name || '',
    project_name: initialTaskData?.project_name || '',
    due: initialTaskData?.due || '',
    created_at: initialTaskData?.created_at || null,
  })
  const [loading, setLoading] = useState(false)
  const [estimateInput, setEstimateInput] = useState<string>('')
  const [estimateMinutes, setEstimateMinutes] = useState<number | null>(null)
  const [history, setHistoryState] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [subtasks, setSubtasks] = useState<any[]>([])
  const [newSub, setNewSub] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        // fetch task detail from backend (should return d.content, d.description, d.project_id, d.project_name, d.due, d.added_at)
        const res = await fetch(`/api/todoist/task?id=${encodeURIComponent(task.id)}`)
        const json = await res.json().catch(() => ({}))
        if (!mounted) return
        const d = json.task || json || {}
        let dueVal = ''
        if (d.due) {
          if (typeof d.due === 'string') dueVal = d.due
          else if (d.due.date) dueVal = d.due.date
        }
        setData((p: any) => ({
          ...p,
          title: d.content || p.title,
          description: d.description || d.note || p.description || '',
          project_id: d.project_id || p.project_id || '',
          project_name: d.project_name || d.project || p.project_name || '',
          due: dueVal || p.due || '',
          created_at: d.added_at || d.date_added || d.created_at || p.created_at || null,
        }))
      } catch (err) {
        console.error('task dialog fetch err', err)
      } finally {
        setLoading(false)
      }
    }

    const loadMeta = async () => {
      try {
        // projects list for dropdown
        const pj = await fetch(`/api/todoist/projects?token=${encodeURIComponent((window as any).__TODOIST_TOKEN__ || '')}`).then((r) => r.json()).catch(() => ({}))
        // backend might return array or {projects:[]}
        const pjList = Array.isArray(pj) ? pj : pj.projects || []
        if (mounted) setProjects(pjList)

        const est = getEstimate(task.id)
        if (mounted) {
          setEstimateMinutes(est?.minutes ?? null)
          setEstimateInput(est ? minutesToLabel(est.minutes) : '')
          setHistoryState(getHistory(task.id) || [])
        }

        // subtasks: try backend endpoint; if not available, empty
        const st = await fetch(`/api/todoist/subtasks?parentId=${encodeURIComponent(task.id)}`).then((r) => r.json()).catch(() => ({}))
        if (mounted) setSubtasks(st?.subtasks || [])
      } catch (err) {
        console.error('task dialog meta load err', err)
      }
    }

    load()
    loadMeta()
    return () => { mounted = false }
  }, [task.id])

  const showToast = (msg: string) => {
    // dispatch appToast (handled by TodoistTasksView)
    window.dispatchEvent(new CustomEvent('appToast', { detail: { message: msg } }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const payload: any = { id: task.id }
      if (data.description !== undefined) payload.description = data.description
      if (data.due !== undefined) payload.due = data.due || null
      // project: either project_id if selected or project_name - prefer id
      if (data.project_id) payload.project_id = data.project_id
      else if (data.project_name) payload.project_name = data.project_name
      const res = await fetch('/api/todoist/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error('Błąd API: ' + txt)
      }
      window.dispatchEvent(new Event('taskUpdated'))
      showToast('Zapisano zmiany')
      // refresh local history
      setHistoryState(getHistory(task.id))
      onClose?.()
    } catch (err) {
      console.error('task update error', err)
      showToast('Błąd zapisu')
    } finally {
      setLoading(false)
    }
  }

  const handleEstimateSave = () => {
    try {
      // parse input to minutes
      const mins = parseEstimateToMinutes(estimateInput)
      if (mins == null) {
        showToast('Nieprawidłowy format estymaty')
        return
      }
      setEstimate(task.id, mins)
      setEstimateMinutes(mins)
      showToast('Estymata zapisana (minuty)')
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      console.error('estimate save err', err)
      showToast('Błąd zapisu estymaty')
    }
  }

  const handleAddSubtask = async () => {
    if (!newSub.trim()) return
    try {
      const res = await fetch('/api/todoist/subtasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentId: task.id, content: newSub.trim() }) })
      const j = await res.json().catch(() => ({}))
      setSubtasks((s) => [...s, j.subtask])
      setNewSub('')
      showToast('Dodano subtask lokalnie')
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      console.error('add subtask err', err)
      showToast('Błąd dodawania subtaska')
    }
  }

  const handleToggleSubtask = async (s: any) => {
    try {
      const res = await fetch('/api/todoist/subtasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentId: task.id, subtaskId: s.id, patch: { completed: !s.completed } }) })
      const j = await res.json().catch(() => ({}))
      setSubtasks((arr) => arr.map((x) => (x.id === s.id ? j.subtask : x)))
      showToast('Zaktualizowano subtask')
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      console.error('subtask toggle err', err)
      showToast('Błąd')
    }
  }

  return (
    <div className="max-w-2xl w-full bg-white rounded-lg p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{data.title || 'Szczegóły zadania'}</h3>
        <button onClick={() => onClose?.()} className="text-sm text-gray-500">Zamknij</button>
      </div>

      <div className="space-y-3">
        <label className="text-sm text-gray-700">Opis</label>
        <textarea value={data.description || ''} onChange={(e) => setData((p: any) => ({ ...p, description: e.target.value }))} className="w-full border p-2 rounded min-h-[120px]" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">Projekt</label>
            <select value={data.project_id || ''} onChange={(e) => setData((p: any) => ({ ...p, project_id: e.target.value }))} className="w-full border p-2 rounded">
              <option value="">(Brak projektu)</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="text-xs text-gray-400 mt-1">Możesz zmienić projekt</div>
          </div>

          <div>
            <label className="text-sm text-gray-700">Deadline</label>
            <input type="date" value={data.due ? (typeof data.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.due) ? data.due : parseDueToLocalYMD(data.due) ?? '') : ''} onChange={(e) => setData((p: any) => ({ ...p, due: e.target.value }))} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <label className="text-sm text-gray-700">Estymowany czas (minuty)</label>
            <div className="flex gap-2 items-center">
              <input value={estimateInput} onChange={(e) => setEstimateInput(e.target.value)} className="w-full border p-2 rounded" placeholder="np. 30m / 2h / 90" />
              <button onClick={handleEstimateSave} className="px-3 py-2 bg-violet-600 text-white rounded">Zapisz</button>
            </div>
            {estimateMinutes !== null && <div className="text-xs text-gray-500 mt-1">Zapisano: {minutesToLabel(estimateMinutes)} ({estimateMinutes} min)</div>}
          </div>

          <div>
            <label className="text-sm text-gray-700">Utworzono</label>
            <div className="text-sm text-gray-500">
              {data.created_at ? `${new Date(data.created_at).toLocaleString()} (${Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000)} dni temu)` : '—'}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-700">Subtaski</label>
          <ul className="space-y-2 mt-2">
            {subtasks.length === 0 ? <div className="text-xs text-gray-400">Brak subtasków</div> : subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <input type="checkbox" checked={!!s.completed} onChange={() => handleToggleSubtask(s)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{s.content}</div>
                  <div className="text-xs text-gray-400">{s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex gap-2">
            <input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Nowy subtask..." className="flex-1 border p-2 rounded" />
            <button onClick={handleAddSubtask} className="px-3 py-2 bg-green-600 text-white rounded">Dodaj</button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded bg-gray-100" onClick={() => onClose?.()}>Anuluj</button>
          <button className="px-4 py-2 rounded bg-violet-600 text-white" onClick={handleSave} disabled={loading}>{loading ? 'Zapisywanie...' : 'Zapisz'}</button>
        </div>
      </div>
    </div>
  )
}
