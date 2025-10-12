'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface ChatSidebarProps {
  onSelectChat?: (
    mode: 'global' | 'task' | 'six_hats' | 'todoist',
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

type TodoistSession = {
  id: string
  title: string
  timestamp: number
  last?: string
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [tab, setTab] = useState<'global' | 'task' | 'six_hats' | 'todoist'>('todoist')
  const [globalChats, setGlobalChats] = useState<ChatPreview[]>([])
  const [taskChats, setTaskChats] = useState<TaskPreview[]>([])
  const [sixHatsChats, setSixHatsChats] = useState<ChatPreview[]>([])
  const [todoistSessions, setTodoistSessions] = useState<TodoistSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // 🔄 Wczytaj dane z localStorage
  const loadChats = () => {
    if (typeof window === 'undefined') return

    // 🌍 Globalne czaty
    const global: ChatPreview[] = JSON.parse(localStorage.getItem('chat_global') || '[]')
      .filter((m: any) => m.role === 'user')
      .map((m: any) => ({
        content: m.content,
        date: new Date(m.timestamp).toLocaleString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: m.timestamp || 0,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15)
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
          last: lastMsg?.content || '(brak wiadomości)',
          date,
          timestamp: lastMsg?.timestamp || 0,
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15)
    setTaskChats(tasks)

    // 🎩 Six Hats
    const sixHats: ChatPreview[] = JSON.parse(localStorage.getItem('chat_six_hats') || '[]')
      .filter((m: any) => m.role === 'user')
      .map((m: any) => ({
        content: m.content,
        date: new Date(m.timestamp).toLocaleString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: m.timestamp || 0,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15)
    setSixHatsChats(sixHats)

    // 🧠 Todoist Sessions
    const sessions: TodoistSession[] = JSON.parse(
      localStorage.getItem('chat_sessions_todoist') || '[]'
    )
      .map((s: any) => {
        const messages = JSON.parse(localStorage.getItem(`chat_todoist_${s.id}`) || '[]')
        const lastMsg = messages[messages.length - 1]
        return {
          ...s,
          last: lastMsg?.content || '(brak wiadomości)',
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 25)
    setTodoistSessions(sessions)
  }

  useEffect(() => {
    loadChats()
    window.addEventListener('storage', loadChats)
    window.addEventListener('chatUpdated', loadChats)
    return () => {
      window.removeEventListener('storage', loadChats)
      window.removeEventListener('chatUpdated', loadChats)
    }
  }, [])

  const handleSelect = (mode: any, session: any) => {
    setActiveSessionId(session.id)
    onSelectChat?.(mode, { id: session.id, content: session.title })
  }

  return (
    <div className="w-[270px] border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* HEADER */}
      <div className="p-3 border-b bg-white flex justify-between items-center">
        <h2 className="font-semibold text-gray-700 text-sm">💬 Historia czatów</h2>
        <button
          onClick={loadChats}
          className="text-gray-500 hover:text-green-600 transition"
          title="Odśwież"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* TABS */}
      <div className="flex border-b bg-gray-100 text-sm font-medium text-gray-600">
        {[
          { key: 'global', label: 'Globalne', count: globalChats.length },
          { key: 'task', label: 'Zadania', count: taskChats.length },
          { key: 'six_hats', label: 'Six Hats', count: sixHatsChats.length },
          { key: 'todoist', label: 'Todoist', count: todoistSessions.length },
        ].map((t) => (
          <button
            key={t.key}
            className={`flex-1 py-2 ${
              tab === t.key ? 'bg-white text-green-700 font-semibold' : 'hover:bg-gray-200'
            }`}
            onClick={() => setTab(t.key as any)}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {tab === 'global' &&
          (globalChats.length === 0 ? (
            <p className="text-gray-500 italic">Brak rozmów globalnych.</p>
          ) : (
            globalChats.map((chat, i) => (
              <div
                key={i}
                onClick={() => handleSelect('global', { id: `global_${i}`, title: chat.content })}
                title={chat.content}
                className={`cursor-pointer border rounded-lg p-2 transition ${
                  activeSessionId === `global_${i}`
                    ? 'bg-green-100 border-green-300'
                    : 'bg-white hover:bg-green-50'
                }`}
              >
                <p className="text-xs text-gray-500">{chat.date}</p>
                <p className="truncate text-gray-800">{chat.content}</p>
              </div>
            ))
          ))}

        {tab === 'task' &&
          (taskChats.length === 0 ? (
            <p className="text-gray-500 italic">Brak rozmów z zadaniami.</p>
          ) : (
            taskChats.map((t, i) => (
              <div
                key={t.id}
                onClick={() => handleSelect('task', { id: t.id, title: t.title })}
                title={t.last}
                className={`cursor-pointer border rounded-lg p-2 transition ${
                  activeSessionId === t.id
                    ? 'bg-green-100 border-green-300'
                    : 'bg-white hover:bg-green-50'
                }`}
              >
                <p className="font-medium text-gray-800 truncate">{t.title}</p>
                <p className="text-xs text-gray-500">{t.date}</p>
                <p className="text-xs text-gray-600 italic truncate">{t.last}</p>
              </div>
            ))
          ))}

        {tab === 'six_hats' &&
          (sixHatsChats.length === 0 ? (
            <p className="text-gray-500 italic">Brak rozmów Six Hats.</p>
          ) : (
            sixHatsChats.map((chat, i) => (
              <div
                key={i}
                onClick={() => handleSelect('six_hats', { id: `six_${i}`, title: chat.content })}
                title={chat.content}
                className={`cursor-pointer border rounded-lg p-2 transition ${
                  activeSessionId === `six_${i}`
                    ? 'bg-green-100 border-green-300'
                    : 'bg-white hover:bg-green-50'
                }`}
              >
                <p className="text-xs text-gray-500">{chat.date}</p>
                <p className="truncate text-gray-800">{chat.content}</p>
              </div>
            ))
          ))}

        {tab === 'todoist' &&
          (todoistSessions.length === 0 ? (
            <p className="text-gray-500 italic">Brak historii Todoist.</p>
          ) : (
            todoistSessions.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelect('todoist', s)}
                title={s.last}
                className={`cursor-pointer border rounded-lg p-2 transition ${
                  activeSessionId === s.id
                    ? 'bg-green-100 border-green-300'
                    : 'bg-white hover:bg-green-50'
                }`}
              >
                <p className="font-medium text-gray-800 truncate">{s.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(s.timestamp).toLocaleString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-xs text-gray-600 italic truncate">{s.last}</p>
              </div>
            ))
          ))}
      </div>
    </div>
  )
}
