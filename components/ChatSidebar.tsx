'use client'

import { useEffect, useState } from 'react'

interface ChatSidebarProps {
  onSelectChat?: (
    mode: 'global' | 'task' | 'six_hats',
    task?: { id: string; content: string }
  ) => void
}

type ChatPreview = {
  content: string
  date: string
  timestamp: number
}

type TaskPreview = {
  id: string
  title: string
  last: string
  date: string
  timestamp: number
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [tab, setTab] = useState<'global' | 'task' | 'six_hats'>('global')
  const [globalChats, setGlobalChats] = useState<ChatPreview[]>([])
  const [taskChats, setTaskChats] = useState<TaskPreview[]>([])
  const [sixHatsChats, setSixHatsChats] = useState<ChatPreview[]>([])

  // 🔄 Wczytaj dane z localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadChats = () => {
      // 🌍 Global
      const global: ChatPreview[] = JSON.parse(localStorage.getItem('chat_global') || '[]')
        .filter((m: any) => m.role === 'user')
        .map((m: any) => ({
          content: m.content,
          date: m.timestamp
            ? new Date(m.timestamp).toLocaleString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'brak daty',
          timestamp: m.timestamp || 0,
        }))
        .sort((a: ChatPreview, b: ChatPreview) => b.timestamp - a.timestamp)
        .slice(0, 10)
      setGlobalChats(global)

      // ✅ Taski
      const tasks: TaskPreview[] = Object.keys(localStorage)
        .filter((k) => k.startsWith('chat_task_'))
        .map((k) => {
          const chat = JSON.parse(localStorage.getItem(k) || '[]')
          const lastMsg = chat[chat.length - 1]
          const id = k.replace('chat_task_', '')
          const title = localStorage.getItem(`task_title_${id}`) || 'Zadanie bez nazwy'
          const date = lastMsg?.timestamp
            ? new Date(lastMsg.timestamp).toLocaleString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'brak daty'
          return {
            id,
            title,
            last: lastMsg?.content || '(brak)',
            date,
            timestamp: lastMsg?.timestamp || 0,
          }
        })
        .sort((a: TaskPreview, b: TaskPreview) => b.timestamp - a.timestamp)
        .slice(0, 10)
      setTaskChats(tasks)

      // 🎩 Six Hats
      const sixHats: ChatPreview[] = JSON.parse(localStorage.getItem('chat_six_hats') || '[]')
        .filter((m: any) => m.role === 'user')
        .map((m: any) => ({
          content: m.content,
          date: m.timestamp
            ? new Date(m.timestamp).toLocaleString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'brak daty',
          timestamp: m.timestamp || 0,
        }))
        .sort((a: ChatPreview, b: ChatPreview) => b.timestamp - a.timestamp)
        .slice(0, 10)
      setSixHatsChats(sixHats)
    }

    loadChats()
    window.addEventListener('storage', loadChats)
    window.addEventListener('chatUpdated', loadChats)
    return () => {
      window.removeEventListener('storage', loadChats)
      window.removeEventListener('chatUpdated', loadChats)
    }
  }, [])

  return (
    <div className="w-[260px] border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* HEADER */}
      <div className="p-3 border-b bg-white flex justify-between items-center">
        <h2 className="font-semibold text-gray-700 text-sm">💬 Historia czatów</h2>
      </div>

      {/* TABS */}
      <div className="flex border-b bg-gray-100">
        <button
          className={`flex-1 py-2 text-sm ${
            tab === 'global' ? 'bg-white font-semibold text-green-700' : 'text-gray-600'
          }`}
          onClick={() => setTab('global')}
        >
          Globalne
        </button>
        <button
          className={`flex-1 py-2 text-sm ${
            tab === 'task' ? 'bg-white font-semibold text-green-700' : 'text-gray-600'
          }`}
          onClick={() => setTab('task')}
        >
          Zadania
        </button>
        <button
          className={`flex-1 py-2 text-sm ${
            tab === 'six_hats' ? 'bg-white font-semibold text-green-700' : 'text-gray-600'
          }`}
          onClick={() => setTab('six_hats')}
        >
          Six Hats
        </button>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'global' &&
          (globalChats.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Brak rozmów globalnych.</p>
          ) : (
            globalChats.map((chat, i) => (
              <div
                key={i}
                onClick={() => onSelectChat?.('global')}
                className="cursor-pointer border rounded-lg p-2 bg-white hover:bg-green-50 transition"
              >
                <p className="text-xs text-gray-500">{chat.date}</p>
                <p className="text-sm text-gray-800 truncate">{chat.content}</p>
              </div>
            ))
          ))}

        {tab === 'task' &&
          (taskChats.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Brak rozmów z zadaniami.</p>
          ) : (
            taskChats.map((t, i) => (
              <div
                key={i}
                onClick={() => onSelectChat?.('task', { id: t.id, content: t.title })}
                className="cursor-pointer border rounded-lg p-2 bg-white hover:bg-green-50 transition"
              >
                <p className="font-medium text-gray-800 text-sm truncate">{t.title}</p>
                <p className="text-xs text-gray-500">{t.date}</p>
                <p className="text-xs text-gray-600 italic line-clamp-2">{t.last}</p>
              </div>
            ))
          ))}

        {tab === 'six_hats' &&
          (sixHatsChats.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Brak rozmów Six Hats.</p>
          ) : (
            sixHatsChats.map((chat, i) => (
              <div
                key={i}
                onClick={() => onSelectChat?.('six_hats')}
                className="cursor-pointer border rounded-lg p-2 bg-white hover:bg-green-50 transition"
              >
                <p className="text-xs text-gray-500">{chat.date}</p>
                <p className="text-sm text-gray-800 truncate">{chat.content}</p>
              </div>
            ))
          ))}
      </div>
    </div>
  )
}
