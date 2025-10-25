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
        <div className="relative flex items-center gap-3 px-5 py-4 border-b bg-white">
          <div className="min-w-0 pr-20">
            <h3 className="text-lg font-semibold truncate" title={sessionTitle || `Rozmowa — ${assistant}`}>{sessionTitle || `Rozmowa — ${assistant}`}</h3>
            <div className="text-xs text-gray-500">Asystent: {assistant}</div>
          </div>

          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="absolute right-4 top-4 z-50 text-sm text-gray-600 hover:text-gray-800 bg-white px-2 py-1 rounded"
          >
            Zamknij
          </button>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-72px)]">
          <TodoistAIView assistant={assistant} initialTaskId={sessionId} />
        </div>
      </div>
    </div>
  )
}
