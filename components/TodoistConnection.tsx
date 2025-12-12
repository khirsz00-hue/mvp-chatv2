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
  const [openTask, setOpenTask] = useState<{ id: string; title: string; description?: string } | null>(null)

  useEffect(() => {
    const handleTaskEvent = (event: any) => {
      const detail = event?.detail
      if (!detail?.task) return
      // open TaskDialog only for explicit taskSelect events that request dialog
      if (detail.openTaskDialog && detail.task) {
        setOpenTask({ id: detail.task.id, title: detail.task.title, description: detail.task.description })
      }
    }

    const handleChatSelect = (event: any) => {
      const detail = event?.detail || {}
      if (detail.openTaskDialog && detail.task) {
        setOpenTask({ id: detail.task.id, title: detail.task.title, description: detail.task.description })
      }
    }

    window.addEventListener('taskSelect', handleTaskEvent as EventListener)
    window.addEventListener('chatSelect', handleChatSelect as EventListener)

    return () => {
      window.removeEventListener('taskSelect', handleTaskEvent as EventListener)
      window.removeEventListener('chatSelect', handleChatSelect as EventListener)
    }
  }, [])

  const renderView = () => {
    if (assistant === 'Todoist Helper') {
      return <TodoistTasksView token={token} onUpdate={() => window.dispatchEvent(new Event('taskUpdated'))} />
    }
    // AI Planner or 6 Hats render AI view (planner will ingest tasks/calendar)
    return <TodoistAIView assistant={assistant} />
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-180px)] w-full bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-soft-lg">
      {/* Header with connection status */}
      <div className="flex justify-between items-center p-4 px-6 bg-gradient-to-r from-success-50 to-brand-50 border-b border-success-100">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-soft border border-success-200">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-900">{assistant}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-100 text-success-700 text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Połączono z Todoist
          </div>
          <button 
            onClick={onDisconnect} 
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 shadow-soft hover:shadow-soft-lg"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Odłącz
            </div>
          </button>
        </div>
      </div>

      {/* Content area with smooth transitions */}
      <div className="flex-1 relative w-full overflow-hidden bg-gradient-to-br from-gray-50 to-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={assistant}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0 w-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Task Dialog */}
      {openTask && (
        <TaskDialog task={{ id: openTask.id, title: openTask.title }} initialTaskData={{ description: openTask.description }} mode="task" onClose={() => setOpenTask(null)} />
      )}
    </div>
  )
}
