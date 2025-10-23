'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TodoistTasksView from './TodoistTasksView'
import TodoistAIView from './TodoistAIView'
import TaskDialog from './TaskDialog'
import type { AssistantKey } from '@/utils/chatStorage'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
  assistant: AssistantKey
}

export default function TodoistConnection({ token, onDisconnect, assistant }: TodoistConnectionProps) {
  // remove local mode switching here — page-level assistant determines view
  const [openTask, setOpenTask] = useState<{ id: string; title: string; description?: string } | null>(null)

  useEffect(() => {
    const handleTaskEvent = (event: any) => {
      const detail = event?.detail
      if (!detail?.task) return
      setOpenTask({ id: detail.task.id, title: detail.task.title, description: detail.task.description })
    }

    const handleChatSelect = (event: any) => {
      const detail = event?.detail || {}
      if (detail.openTaskDialog && detail.task) {
        setOpenTask({ id: detail.task.id, title: detail.task.title, description: detail.task.description })
      }
    }

    window.addEventListener('taskHelp', handleTaskEvent as EventListener)
    window.addEventListener('taskSelect', handleTaskEvent as EventListener)
    window.addEventListener('chatSelect', handleChatSelect as EventListener)

    return () => {
      window.removeEventListener('taskHelp', handleTaskEvent as EventListener)
      window.removeEventListener('taskSelect', handleTaskEvent as EventListener)
      window.removeEventListener('chatSelect', handleChatSelect as EventListener)
    }
  }, [])

  // Decide what to render based on the assistant selected at page level:
  // - Todoist Helper => show Tasks View
  // - AI Planner => show AI View (uses todoist + calendar context)
  // - 6 Hats => show AI View placeholder (you can extend later)
  const renderView = () => {
    if (assistant === 'Todoist Helper') {
      return <TodoistTasksView token={token} onUpdate={() => window.dispatchEvent(new Event('taskUpdated'))} />
    }
    if (assistant === 'AI Planner') {
      return <TodoistAIView token={token} />
    }
    // 6 Hats fallback (placeholder reuses AI view for now)
    return <TodoistAIView token={token} />
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-100px)] w-full bg-gray-50 border border-green-200 rounded-xl overflow-hidden">
      <div className="flex justify-between items-center p-2 px-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          {/* Display which assistant is active (read-only here) */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
            <span className="text-sm font-medium">{assistant}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-green-700 whitespace-nowrap">🟢 Połączono z Todoist</span>
          <button onClick={onDisconnect} className="text-xs px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition">Odłącz</button>
        </div>
      </div>

      <div className="flex-1 relative w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={assistant} // re-mount view when assistant changes for clean state
            initial={{ opacity: 0, x: assistant === 'Todoist Helper' ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: assistant === 'Todoist Helper' ? 40 : -40 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 w-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {openTask && (
        <TaskDialog task={{ id: openTask.id, title: openTask.title }} initialTaskData={{ description: openTask.description }} mode="task" onClose={() => setOpenTask(null)} />
      )}
    </div>
  )
}
