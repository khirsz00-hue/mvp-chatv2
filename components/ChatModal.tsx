'use client'

import React from 'react'
import TodoistAIView from './TodoistAIView'

export default function ChatModal({
  assistant,
  sessionId,
  sessionTitle,
  isOpen,
  onClose,
}: {
  assistant: string
  sessionId: string
  sessionTitle?: string
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl h-[80vh] bg-white rounded-lg shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b bg-white sticky top-0 z-40">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold truncate" style={{ maxWidth: 'calc(100% - 90px)' }}>{sessionTitle || `Rozmowa — ${assistant}`}</h3>
            <div className="text-xs text-gray-500">Asystent: {assistant}</div>
          </div>
          <button onClick={onClose} className="ml-4 text-sm text-gray-600 hover:text-gray-800 z-50">Zamknij</button>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-72px)]">
          <TodoistAIView assistant={assistant} initialTaskId={sessionId} />
        </div>
      </div>
    </div>
  )
}
