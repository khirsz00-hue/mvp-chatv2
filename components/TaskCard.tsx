'use client'

import { useEffect, useRef, useState } from 'react'
import TaskDialog from './TaskDialog'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [isHidden, setIsHidden] = useState(false)
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

  const triggerUpdate = (msg: string) => {
    window.dispatchEvent(new Event('taskUpdated'))
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // ✅ Ukończ zadanie
  const handleComplete = async () => {
    await fetch('/api/todoist/complete', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token }),
    })
    setIsHidden(true)
    triggerUpdate('✅ Zadanie ukończone')
    setTimeout(() => onAction('completed'), 400)
  }

  // 🗑 Usuń zadanie
  const handleDelete = async () => {
    await fetch('/api/todoist/delete', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token }),
    })
    setIsHidden(true)
    triggerUpdate('🗑️ Zadanie usunięte')
    setTimeout(() => onAction('deleted'), 400)
  }

  // 📅 Przełóż zadanie
  const handlePostpone = async (newDate: string) => {
    if (!newDate) return
    await fetch('/api/todoist/postpone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, token, newDate }),
    })
    triggerUpdate(`📅 Przeniesiono na ${new Date(newDate).toLocaleDateString('pl-PL')}`)
    onAction('postponed')
  }

  // 📆 Otwórz date pickera
  const openDatePicker = () => dateInputRef.current?.showPicker?.()

  return (
    <AnimatePresence mode="popLayout">
      {!isHidden && (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="relative border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all group"
        >
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
                <span className="text-yellow-500 text-lg cursor-pointer select-none hover:scale-110 transition-transform">
                  💡
                </span>
                <div className="absolute right-0 top-6 z-20 hidden group-hover/summary:block bg-white border border-gray-200 text-gray-700 text-xs rounded-md p-3 w-64 shadow-xl animate-fadeIn">
                  <p className="font-semibold text-gray-800">🧠 Wnioski AI:</p>
                  <p className="mt-1 text-gray-600 whitespace-pre-line leading-snug">{summary}</p>
                </div>
              </div>
            )}
          </div>

          {/* 🔘 Przyciski akcji */}
          <div className="flex justify-end flex-wrap gap-2 mt-3">
            {[
              {
                label: '✅ Ukończ',
                color: 'green',
                onClick: handleComplete,
              },
              {
                label: '📅 Przełóż',
                color: 'blue',
                onClick: openDatePicker,
              },
              {
                label: '🗑 Usuń',
                color: 'red',
                onClick: handleDelete,
              },
              {
                label: '💬 Pomóż mi',
                color: 'purple',
                onClick: () => {
                  setDialogMode('help')
                  setShowDialog(true)
                },
              },
            ].map((btn) => (
              <motion.button
                key={btn.label}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={btn.onClick}
                className={`px-3 py-1 text-xs rounded-lg bg-${btn.color}-100 hover:bg-${btn.color}-200 text-${btn.color}-700 font-medium transition-all`}
              >
                {btn.label}
              </motion.button>
            ))}

            <input
              ref={dateInputRef}
              type="date"
              className="fixed top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] opacity-0 pointer-events-auto"
              onChange={(e) => handlePostpone(e.target.value)}
            />
          </div>

          {/* 💬 Modal czatu */}
          {showDialog && (
            <TaskDialog task={task} mode={dialogMode} onClose={() => setShowDialog(false)} />
          )}

          {/* ✅ Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
