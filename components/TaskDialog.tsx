'use client'

import React, { useEffect, useState } from 'react'
import { parseDueToLocalYMD } from '../utils/date'
import { getEstimate, setEstimate, getHistory } from '../utils/localTaskStore'

export default function TaskDialog({
  task,
  initialTaskData,
  onClose,
}: {
  task: { id: string; title?: string }
  initialTaskData?: { description?: string; project_name?: string; due?: any }
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
  const [estimate, setEstimateLocal] = useState<string>('')
  const [history, setHistoryState] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
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

    const loadLocalMeta = () => {
      const est = getEstimate(task.id)
      setEstimateLocal(est?.value ?? '')
      const h = getHistory(task.id)
      setHistoryState(h || [])
    }

    load()
    loadLocalMeta()
    return () => { mounted = false }
  }, [task.id])

  const showToast = (msg: string) => {
    window.dispatchEvent(new CustomEvent('appToast', { detail: { message: msg } }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const payload: any = { id: task.id }
      if (data.description !== undefined) payload.description = data.description
      if (data.due !== undefined) payload.due = data.due || null
      if (data.project_id !== undefined) payload.project_id = data.project_id
      // call backend update (existing endpoint)
      await fetch('/api/todoist/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      window.dispatchEvent(new Event('taskUpdated'))
      showToast('Zapisano zmiany')
      // refresh local history display
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
      setEstimate(task.id, estimate)
      showToast('Estymata zapisana lokalnie')
      window.dispatchEvent(new Event('taskUpdated'))
    } catch (err) {
      console.error('estimate save err', err)
      showToast('Błąd zapisu estymaty')
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
            <label className="text-sm text-gray-700">Projekt (nazwa)</label>
            <input value={data.project_name || data.project_id || ''} onChange={(e) => setData((p: any) => ({ ...p, project_name: e.target.value }))} className="w-full border p-2 rounded" />
          </div>

          <div>
            <label className="text-sm text-gray-700">Deadline</label>
            <input type="date" value={data.due ? (typeof data.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.due) ? data.due : parseDueToLocalYMD(data.due) ?? '') : ''} onChange={(e) => setData((p: any) => ({ ...p, due: e.target.value }))} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <label className="text-sm text-gray-700">Estymowany czas (lokalnie)</label>
            <div className="flex gap-2">
              <input value={estimate} onChange={(e) => setEstimateLocal(e.target.value)} className="w-full border p-2 rounded" placeholder="np. 30m / 2h" />
              <button onClick={handleEstimateSave} className="px-3 py-2 bg-violet-600 text-white rounded">Zapisz</button>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-700">Utworzono</label>
            <div className="text-sm text-gray-500">
              {data.created_at ? `${new Date(data.created_at).toLocaleString()} (${Math.floor((Date.now()-new Date(data.created_at).getTime())/86400000)} dni temu)` : '—'}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-700">Historia przeniesień (lokalnie)</label>
          <ul className="text-xs text-gray-600 space-y-1 mt-2">
            {history.length === 0 ? <li className="text-gray-400">Brak zapisanej historii</li> : history.map((h: any, i: number) => <li key={i}>{new Date(h.when).toLocaleString()} — {h.from || '—'} → {h.to || '—'}</li>)}
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded bg-gray-100" onClick={() => onClose?.()}>Anuluj</button>
          <button className="px-4 py-2 rounded bg-violet-600 text-white" onClick={handleSave} disabled={loading}>{loading ? 'Zapisywanie...' : 'Zapisz'}</button>
        </div>
      </div>
    </div>
  )
}
