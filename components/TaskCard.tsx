'use client'

import { useEffect, useRef, useState } from 'react'
import TaskDialog from './TaskDialog'

interface Task {
  id: string
  content: string
  due?: string
  priority?: number
  project_id?: string
}

interface TaskCardProps {
  task: Task
  token: string
  onAction: (action: 'completed' | 'deleted' | 'postponed') => void
}

export default function TaskCard({ task, token, onAction }: TaskCardProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState<'none' | 'help'>('none')
  const [summary, setSummary] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // 📦 zapisz nazwę taska (dla historii czatów)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`task_title_${task.id}`, task.content)
    }
  }, [task.id, task.content])

  // 🧠 wczytaj lokalną syntezę (AI summary)
  useEffect(() => {
    const loadSummary = () => {
      const saved = localStorage.getItem(`summary_${task.id}`)
      setSummary(saved || null)
    }

    loadSummary()
    const handler = () => loadSummary()
    window.addEventListener('taskUpdated', handler)
    return () => window.removeEventListener('taskUpdated', handler)
  }, [task.id])

  // ✅ Ukończ zadanie
  const handleComplete = async () => {
    await fetch('/api/todoist/complete', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token }),
    })
    onAction('completed')
  }

  // 🗑 Usuń zadanie
  const handleDelete = async () => {
    await fetch('/api/todoist/delete', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token }),
    })
    onAction('deleted')
  }

  // 📅 Przełóż zadanie
  const handlePostpone = async (newDate: string) => {
    if (!newDate) return
    try {
      const res = await fetch('/api/todoist/postpone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, token, newDate }),
      })
      const data = await res.json()
      console.log('📦 POSTPONE result:', data)

      // 🔄 Odświeżenie listy
      window.dispatchEvent(new Event('taskUpdated'))

      // ✅ Toast
      setToast(`✅ Zadanie przeniesione na ${new Date(newDate).toLocaleDateString('pl-PL')}`)
      setTimeout(() => setToast(null), 2500)

      onAction('postponed')
    } catch (err) {
      console.error('❌ POSTPONE error:', err)
    }
  }

  // 📆 Otwórz date pickera
  const openDatePicker = () => {
    dateInputRef.current?.showPicker?.()
  }

  return (
    <div className="relative border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition group">
      {/* 📋 Treść zadania */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-2">
          <p className="font-medium text-gray-800 leading-snug">{task.content}</p>
          {task.due && (
            <span className="text-xs text-gray-500">
              {new Date(task.due).toLocaleDateString('pl-PL')}
            </span>
          )}
        </div>

        {/* 💡 Tooltip z AI Summary */}
        {summary && (
          <div className="ml-2 relative group/summary">
            <span className="text-yellow-500 text-lg cursor-pointer select-none">💡</span>
            <div className="absolute right-0 top-6 z-20 hidden group-hover/summary:block bg-white border border-gray-200 text-gray-700 text-xs rounded-md p-3 w-64 shadow-xl">
              <p className="font-semibold text-gray-800">🧠 Wnioski AI:</p>
              <p className="mt-1 text-gray-600 whitespace-pre-line leading-snug">{summary}</p>
            </div>
          </div>
        )}
      </div>

      {/* 🔘 Przyciski akcji */}
      <div className="flex justify-end flex-wrap gap-2 mt-3">
        <button
          onClick={handleComplete}
          className="px-3 py-1 text-xs rounded-lg bg-green-100 hover:bg-green-200 text-green-700 font-medium transition-all"
        >
          ✅ Ukończ
        </button>

        {/* 📅 Przełóż */}
        <button
          onClick={openDatePicker}
          className="px-3 py-1 text-xs rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium transition-all"
        >
          📅 Przełóż
        </button>
        <input
          ref={dateInputRef}
          type="date"
          className="fixed top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] opacity-0 pointer-events-auto"
          onChange={(e) => handlePostpone(e.target.value)}
        />

        <button
          onClick={handleDelete}
          className="px-3 py-1 text-xs rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-all"
        >
          🗑 Usuń
        </button>

        <button
          onClick={() => {
            setDialogMode('help')
            setShowDialog(true)
          }}
          className="px-3 py-1 text-xs rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium transition-all"
        >
          💬 Pomóż mi
        </button>
      </div>

      {/* 💬 Modal czatu */}
      {showDialog && (
        <TaskDialog
          task={task}
          mode={dialogMode}
          onClose={() => setShowDialog(false)}
        />
      )}

      {/* ✅ Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-[fadeInUp_0.3s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  )
}
