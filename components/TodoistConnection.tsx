'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TodoistTasksView from './TodoistTasksView'
import TodoistAIView from './TodoistAIView'
import TaskDialog from './TaskDialog'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
}

export default function TodoistConnection({ token, onDisconnect }: TodoistConnectionProps) {
  const [mode, setMode] = useState<'tasks' | 'ai'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('todoist_mode')
      if (saved === 'ai' || saved === 'tasks') return saved
    }
    return 'tasks'
  })

  const [openTask, setOpenTask] = useState<{ id: string; title: string; description?: string } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('todoist_mode', mode)
    }
  }, [mode])

  useEffect(() => {
    const handleTaskEvent = (event: any) => {
      const detail = event?.detail
      if (!detail?.task) return
      setOpenTask({ id: detail.task.id, title: detail.task.title, description: detail.task.description })
    }

    const handleChatSelect = (event: any) => {
      const detail = event?.detail || {}
      // only open TaskDialog for chatSelect if it explicitly requests opening the task dialog
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

  return (
    <div className="relative flex flex-col h-[calc(100vh-100px)] w-full bg-gray-50 border border-green-200 rounded-xl overflow-hidden">
      <div className="flex justify-between items-center p-2 px-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setMode('tasks')}
              className={`px-4 py-1.5 text-sm font-medium transition ${mode === 'tasks' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              📋 Lista zadań
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-1.5 text-sm font-medium transition ${mode === 'ai' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              🤖 Asystent AI
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-green-700 whitespace-nowrap">🟢 Połączono z Todoist</span>
          <button onClick={onDisconnect} className="text-xs px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition">Odłącz</button>
        </div>
      </div>

      <div className="flex-1 relative w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === 'tasks' ? (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 w-full"
            >
              <TodoistTasksView token={token} onUpdate={() => window.dispatchEvent(new Event('taskUpdated'))} />
            </motion.div>
          ) : (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 w-full"
            >
              <TodoistAIView token={token} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {openTask && (
        <TaskDialog task={{ id: openTask.id, title: openTask.title }} initialTaskData={{ description: openTask.description }} mode="task" onClose={() => setOpenTask(null)} />
      )}
    </div>
  )
}
