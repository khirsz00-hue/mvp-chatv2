'use client'

import { useEffect, useState } from 'react'

interface ChatSidebarProps {
  onSelectChat: (mode: 'global' | 'task', task?: { id: string; content: string }) => void
}

interface ChatEntry {
  key: string
  mode: 'global' | 'task'
  title: string
  lastMessage: string
  date: string
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<ChatEntry[]>([])

  // 🔹 Wczytaj wszystkie czaty z localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const allKeys = Object.keys(localStorage)
    const chatKeys = allKeys.filter(k => k.startsWith('chat_'))

    const entries: ChatEntry[] = chatKeys.map(key => {
      const data = localStorage.getItem(key)
      if (!data) return null
      const parsed = JSON.parse(data)

      const last = parsed[parsed.length - 1]
      const title =
        key === 'chat_global'
          ? '🌍 Czat globalny'
          : extractTaskTitle(key, parsed) || 'Zadanie bez nazwy'

      return {
        key,
        mode: key === 'chat_global' ? 'global' : 'task',
        title,
        lastMessage: last?.content?.slice(0, 80) || '(brak wiadomości)',
        date: new Date().toLocaleString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
    }).filter(Boolean) as ChatEntry[]

    setChats(entries.sort((a, b) => (a.mode === 'task' && b.mode === 'global' ? 1 : -1)))
  }, [])

  // 🔧 Wyciąga nazwę taska z pierwszej wiadomości lub z localStorage (summary)
  const extractTaskTitle = (key: string, parsed: any[]): string => {
    const match = key.match(/^chat_task_(.+)$/)
    if (!match) return ''
    const firstUserMsg = parsed.find((m: any) => m.role === 'user')
    const taskName = localStorage.getItem(`task_title_${match[1]}`)
    return taskName || firstUserMsg?.content?.slice(0, 50) || 'Zadanie'
  }

  return (
    <aside className="hidden md:flex flex-col w-72 border-r bg-white h-[calc(100vh-80px)]">
      <div className="p-3 border-b bg-gray-50">
        <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
          💬 Historia czatów
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="text-xs text-gray-500 p-4 italic">
            Brak zapisanych rozmów. Rozpocznij czat z AI, aby się tu pojawiły.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {chats.map((chat, i) => (
              <li
                key={i}
                className="p-3 hover:bg-gray-50 cursor-pointer transition group"
                onClick={() =>
                  onSelectChat(
                    chat.mode,
                    chat.mode === 'task' ? { id: chat.key, content: chat.title } : undefined
                  )
                }
              >
                <p className="font-medium text-sm text-gray-800 group-hover:text-blue-600 truncate">
                  {chat.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{chat.date}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
