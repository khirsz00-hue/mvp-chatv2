'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TooltipPortal from './TooltipPortal'

interface Task {
  id: string
  content: string
  due?: string
  priority?: number
  project_id?: string
  project_name?: string
  labels?: string[]
}

interface TaskCardProps {
  task: Task
  token: string
  onAction: (action: 'completed' | 'deleted' | 'postponed') => void
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (checked: boolean) => void
}

export default function TaskCard({
  task,
  token,
  onAction,
  selectable,
  selected,
  onSelectChange,
}: TaskCardProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isHidden, setIsHidden] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(`summary_${task.id}`)
    setSummary(saved || null)
  }, [task.id])

  const triggerUpdate = (msg: string) => {
    window.dispatchEvent(new Event('taskUpdated'))
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleComplete = async () => {
    await fetch('/api/todoist/complete', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token }),
    })
    setIsHidden(true)
    triggerUpdate('✅ Zadanie ukończone')
    setTimeout(() => onAction('completed'), 400)
  }

  const handleDelete = async () => {
    await fetch('/api/todoist/delete', {
      method: 'POST',
      body: JSON.stringify({ id: task.id, token }),
    })
    setIsHidden(true)
    triggerUpdate('🗑 Zadanie usunięte')
    setTimeout(() => onAction('deleted'), 400)
  }

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

  const openDatePicker = () => dateInputRef.current?.showPicker?.()

  const handleHelp = () => {
    // 🔥 Otwórz modal globalny (TaskDialog) przez event
    window.dispatchEvent(
      new CustomEvent('chatSelect', {
        detail: {
          mode: 'todoist',
          task: { id: task.id, title: task.content },
        },
      })
    )
  }

  return (
    <AnimatePresence mode="popLayout">
      {!isHidden && (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className={`relative border border-gray-200 rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-all overflow-visible ${
            selected ? 'ring-2 ring-blue-300' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Checkbox + treść */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                {selectable && (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => onSelectChange?.(e.target.checked)}
                    className="mt-1 accent-blue-600 cursor-pointer"
                  />
                )}
                <p className="font-medium text-gray-800 text-[13px] leading-snug break-words">
                  {task.content}
                </p>
                {summary && (
                  <div
                    className="ml-1 text-yellow-500 cursor-pointer select-none hover:scale-110 transition-transform"
                    onMouseEnter={(e) =>
                      setTooltipPos({ x: e.clientX, y: e.clientY + 24 })
                    }
                    onMouseMove={(e) =>
                      setTooltipPos({ x: e.clientX, y: e.clientY + 24 })
                    }
                    onMouseLeave={() => setTooltipPos(null)}
                  >
                    💡
                  </div>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                {task.due && (
                  <span>{new Date(task.due).toLocaleDateString('pl-PL')}</span>
                )}
                {task.project_name && (
                  <span className="bg-gray-100 px-1.5 py-[1px] rounded text-gray-600">
                    {task.project_name}
                  </span>
                )}
                {task.labels?.map((label) => (
                  <span
                    key={label}
                    className="bg-gray-100 px-1.5 py-[1px] rounded text-gray-600"
                  >
                    #{label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tooltip 💡 */}
          {tooltipPos && summary && (
            <TooltipPortal>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[99999] bg-white border border-gray-200 text-gray-700 text-xs rounded-md p-2.5 w-64 shadow-2xl pointer-events-none"
                style={{
                  top: tooltipPos.y,
                  left: tooltipPos.x - 260,
                }}
              >
                <p className="font-semibold text-gray-800 mb-1">🧠 Wnioski AI:</p>
                <p className="text-gray-600 whitespace-pre-line leading-snug">
                  {summary}
                </p>
              </motion.div>
            </TooltipPortal>
          )}

          {/* 🔘 Przyciski akcji */}
          <div className="flex flex-wrap justify-end gap-2 mt-3 text-xs">
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleComplete}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
            >
              ✅ <span>Ukończ</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.05 }}
              onClick={openDatePicker}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
            >
              📅 <span>Przenieś</span>
            </motion.button>
            <input
              ref={dateInputRef}
              type="date"
              className="hidden"
              onChange={(e) => handlePostpone(e.target.value)}
            />

            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleDelete}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
            >
              🗑 <span>Usuń</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleHelp}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
            >
              💬 <span>Pomóż mi</span>
            </motion.button>
          </div>

          {/* ✅ Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md shadow-lg backdrop-blur-sm"
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
