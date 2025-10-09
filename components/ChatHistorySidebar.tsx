'use client'

import { useEffect, useState } from 'react'

export default function ChatHistorySidebar({ onSelect }: { onSelect: (id: string) => void }) {
  const [chats, setChats] = useState<{ id: string; task: string; updated: string }[]>([])

  useEffect(() => {
    const stored = Object.keys(localStorage)
      .filter(k => k.startsWith('chat_'))
      .map(k => {
        const chat = JSON.parse(localStorage.getItem(k) || '[]')
        const last = chat[chat.length - 1]
        return {
          id: k,
          task: k.replace('chat_', ''),
          updated: last ? new Date().toLocaleString() : '',
        }
      })
      .sort((a, b) => (a.updated < b.updated ? 1 : -1))

    setChats(stored)
  }, [])

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-2 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2">💬 Historia rozmów</h2>
      {chats.length === 0 && <p className="text-sm text-gray-500">Brak zapisanych rozmów.</p>}

      {chats.map(chat => (
        <button
          key={chat.id}
          onClick={() => onSelect(chat.id)}
          className="w-full text-left p-2 rounded-md hover:bg-gray-100 transition"
        >
          <p className="text-sm font-medium text-gray-800 truncate">{chat.task}</p>
          <p className="text-xs text-gray-500">{chat.updated}</p>
        </button>
      ))}
    </div>
  )
}
