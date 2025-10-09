'use client'

import { useEffect, useState } from 'react'

export default function ChatHistoryPanel({
  isOpen,
  onClose,
  onSelectChat,
}: {
  isOpen: boolean
  onClose: () => void
  onSelectChat: (chatKey: string) => void
}) {
  const [history, setHistory] = useState<
    { key: string; title: string; last: string; date: string }[]
  >([])

  useEffect(() => {
    if (!isOpen) return
    const chats = Object.keys(localStorage)
      .filter(k => k.startsWith('chat_'))
      .map(k => {
        const chat = JSON.parse(localStorage.getItem(k) || '[]')
        const last = chat[chat.length - 1]?.content || '(brak wiadomości)'
        const title =
          k === 'chat_global'
            ? '💬 Globalny czat'
            : localStorage.getItem(`task_title_${k.replace('chat_', '')}`) || k
        const date = new Date().toLocaleString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        return { key: k, title, last, date }
      })
      .reverse()

    setHistory(chats)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      {/* Panel */}
      <div className="w-full max-w-sm h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">💬 Historia czatów</h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            ✕ Zamknij
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center mt-10">
              Brak zapisanych rozmów.
            </p>
          )}

          {history.map(h => (
            <div
              key={h.key}
              className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition cursor-pointer"
              onClick={() => onSelectChat(h.key)}
            >
              <div className="font-medium text-gray-800 truncate">{h.title}</div>
              <div className="text-xs text-gray-500">{h.date}</div>
              <div className="text-xs text-gray-600 italic line-clamp-2 mt-1">{h.last}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
