'use client'

import React, { useEffect, useState } from 'react'
import { parseDueToLocalYMD, ymdFromDate } from '../utils/date'

export default function TaskDialog({
  task,
  initialTaskData,
  mode = 'task',
  onClose,
}: {
  task: { id: string; title?: string }
  initialTaskData?: { description?: string; project_name?: string; due?: any }
  mode?: 'task' | 'other'
  onClose?: () => void
}) {
  const [data, setData] = useState<any>({ title: task.title || '', description: initialTaskData?.description || '', project_name: initialTaskData?.project_name || '', due: initialTaskData?.due || '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // If initial data does not contain key fields, fetch task detail
    const needFetch = !(initialTaskData && (initialTaskData.description || initialTaskData.project_name || initialTaskData.due))
    if (!needFetch) return
    let mounted = true
    const fetchDetail = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/todoist/task?id=${encodeURIComponent(task.id)}`)
        const json = await res.json()
        if (!mounted) return
        const d = json.task || json || {}
        setData({
          title: d.content || task.title || '',
          description: d.description || d.note || '',
          project_name: d.project_name || d.project || '',
          due: d.due?.date ?? (typeof d.due === 'string' ? d.due : '') || '',
        })
      } catch (err) {
        console.error('fetch task detail error', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
    return () => {
      mounted = false
    }
  }, [task.id, initialTaskData])

  const handleSave = async () => {
    try {
      setLoading(true)
      // sanitize due to YYYY-MM-DD
      const payload: any = { id: task.id }
      if (data.description !== undefined) payload.description = data.description
      if (data.due !== undefined) payload.due = data.due || null
      if (data.project_name !== undefined) payload.project_name = data.project_name
      await fetch('/api/todoist/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      window.dispatchEvent(new Event('taskUpdated'))
      onClose?.()
    } catch (err) {
      console.error('task update error', err)
    } finally {
      setLoading(false)
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
        <textarea value={data.description} onChange={(e) => setData((p: any) => ({ ...p, description: e.target.value }))} className="w-full border p-2 rounded min-h-[100px]" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">Projekt</label>
            <input value={data.project_name} onChange={(e) => setData((p: any) => ({ ...p, project_name: e.target.value }))} className="w-full border p-2 rounded" />
          </div>

          <div>
            <label className="text-sm text-gray-700">Deadline</label>
            <input type="date" value={data.due ? (typeof data.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.due) ? data.due : parseDueToLocalYMD(data.due) ?? '') : ''} onChange={(e) => setData((p: any) => ({ ...p, due: e.target.value }))} className="w-full border p-2 rounded" />
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
