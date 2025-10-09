'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TaskDialog from './TaskDialog'
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
  selectable = false,
  selected = false,
  onSelectChange,
}: TaskCardProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isHidden, setIsHidden] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // 🧠 Wczytaj lokalną syntezę (AI summary)
  useEffect(() => {
    const saved = localStorage.getItem(`summary_${task.id}`)
    setSummary(saved || null)
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
    triggerUpdate('🗑 Zadanie usunięte')
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

  const openDatePicker = () => dateInputRef.current?.showPicker?.()

  return (
    <AnimatePresence mode="popLayout">
      {!isHidden && (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className={`relative border border-gray-200 rounded-md p-2.5 bg-white shadow-sm hover:shadow-md transition-all group overflow-visible ${
            selected ? 'ring-2 ring-blue-400' : ''
          }`}
        >
          {/* 📄 Główna sekcja */}
          <div className="flex justify-between items-start gap-2 relative">
            {/* ✅ Checkbox (dla batch-actions) */}
            {selectable && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelectChange?.(e.target.checked)}
                className="mt-[2px] accent-blue-600 cursor-pointer"
              />
            )}

            {/* 📝 Treść zadania */}
            <div className="flex-1 pr-2">
              <p className="font-medium text-gray-800 text-[13px] leading-snug">
                {task.content}
              </p>

              {/* 📅 Szczegóły */}
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

            {/* 💡 Tooltip z AI Summary */}
            {summary && (
              <div className="ml-2 relative group/summary z-[1000]">
                <span
                  className="text-yellow-500 text-base cursor-pointer select-none hover:scale-110 transition-transform"
                  onMouseEnter={(e) =>
                    setTooltipPos({ x: e.clientX, y: e.clientY + 24 })
                  }
                  onMouseMove={(e) =>
                    setTooltipPos({ x: e.clientX, y: e.clientY + 24 })
                  }
                  onMouseLeave={() => setTooltipPos(null)}
                >
                  💡
                </span>

                {/* Portal tooltipa */}
                {tooltipPos && (
                  <TooltipPortal>
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="fixed z-[99999] bg-white border border-gray-200 text-gray-700 text-xs rounded-md p-2.5 w-64 shadow-2xl pointer-events-none"
                      style={{
                        top: tooltipPos.y,
                        left: tooltipPos.x - 256,
                      }}
                    >
                      <p className="font-semibold text-gray-800">🧠 Wnioski AI:</p>
                      <p className="mt-1 text-gray-600 whitespace-pre-line leading-snug">
                        {summary}
                      </p>
                    </motion.div>
                  </TooltipPortal>
                )}
              </div>
            )}
          </div>

          {/* 🔘 Przyciski akcji */}
          <div className="flex justify-end gap-1 mt-2 relative z-10">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleComplete}
              title="Ukończ"
              className="px-2.5 py-0.5 text-xs rounded-md bg-green-100 hover:bg-green-200 text-green-700 font-medium"
            >
              ✅
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={openDatePicker}
              title="Przełóż"
              className="px-2.5 py-0.5 text-xs rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium"
            >
              📅
            </motion.button>
            <input
              ref={dateInputRef}
              type="date"
              className="fixed top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] opacity-0 pointer-events-auto"
              onChange={(e) => handlePostpone(e.target.value)}
            />

            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleDelete}
              title="Usuń"
              className="px-2.5 py-0.5 text-xs rounded-md bg-red-100 hover:bg-red-200 text-red-700 font-medium"
            >
              🗑
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowDialog(true)}
              title="Pomóż mi"
              className="px-2.5 py-0.5 text-xs rounded-md bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium"
            >
              💬
            </motion.button>
          </div>

          {/* 💬 Modal czatu */}
          {showDialog && (
            <TaskDialog task={task} mode="help" onClose={() => setShowDialog(false)} />
          )}

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
