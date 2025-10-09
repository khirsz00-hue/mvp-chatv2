'use client'

import { useEffect, useState } from 'react'
import ChatDock from './ChatDock'

interface GlobalChatProps {
  token: string
  tasks: any[]
  onOpenTaskChat: (t: any) => void
}

interface ChatPreview {
  content: string
  date: string
}

export default function GlobalChat({ token, tasks, onOpenTaskChat }: GlobalChatProps) {
  const [history, setHistory] = useState<ChatPreview[]>([])

  // 🔹 Wczytaj historię czatu globalnego z localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat_global')
      if (saved) {
        const parsed = JSON.parse(saved)
        const previews = parsed
          .filter((m: any) => m.role === 'user')
          .slice(-5)
          .map((m: any) => ({
            content: m.content,
            date: new Date().toLocaleString('pl-PL', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
            }),
          }))
        setHistory(previews.reverse())
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="border-b bg-gray-50 p-3 flex justify-between items-center">
        <h2 className="font-semibold text-gray-700 text-sm">🤖 Asystent Todoist AI</h2>
        <span className="text-xs text-gray-400">Tryb ogólny</span>
      </div>

      {/* TREŚĆ */}
      <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-700 space-y-4">
        {/* Sekcja pomocy */}
        <div>
          <p className="mb-3 font-medium">💡 Możesz zapytać np.:</p>
          <ul className="list-disc ml-4 text-gray-600 space-y-1">
            <li>„Pokaż zadania na dziś”</li>
            <li>„Zaproponuj kolejność realizacji”</li>
            <li>„Które zadania są przeterminowane?”</li>
            <li>„Pogrupuj moje zadania tematycznie”</li>
          </ul>
        </div>

        {/* Sekcja historii */}
        <div className="pt-4 border-t border-gray-200">
          <p className="font-medium mb-2">🕓 Ostatnie rozmowy:</p>
          {history.length > 0 ? (
            <ul className="space-y-2">
              {history.map((h, i) => (
                <li
                  key={i}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                  title={h.content}
                  onClick={() => {
                    navigator.clipboard.writeText(h.content)
                    alert('📋 Skopiowano do schowka: ' + h.content)
                  }}
                >
                  <p className="text-xs text-gray-500">{h.date}</p>
                  <p className="text-sm text-gray-800 truncate">{h.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 italic">
              Brak historii rozmów — rozpocznij czat z AI poniżej.
            </p>
          )}
        </div>
      </div>

      {/* CZAT */}
      <div className="border-t bg-white p-3">
        <ChatDock mode="global" token={token} tasks={tasks} />
      </div>
    </div>
  )
}
