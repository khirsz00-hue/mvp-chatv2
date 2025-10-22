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
  description?: string
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
    const globalData = JSON.parse(localStorage.getItem('chat_global') || '[]') as any[]
    const global: ChatPreview[] = globalData
      .filter((m: any) => m.role === 'user')
      .map((m: any): ChatPreview => ({
        content: m.content,
        date: new Date(m.timestamp).toLocaleString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: m.timestamp || 0,
      }))
      .sort((a: ChatPreview, b: ChatPreview) => b.timestamp - a.timestamp)
      .slice(0, 15)
    setGlobalChats(global)

    // ✅ Taski (łączone: chat_task_ + chat_sessions_task)
    const keys = Object.keys(localStorage)
    const tasksFromChats: TaskPreview[] = keys
      .filter((k: string) => k.startsWith('chat_task_'))
      .map((k: string): TaskPreview => {
        const chat = JSON.parse(localStorage.getItem(k) || '[]') as any[]
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

    // 🧠 Dodatkowo: czaty z chat_sessions_task (wpisy z TaskDialog)
    const sessions = JSON.parse(localStorage.getItem('chat_sessions_task') || '[]') as any[]
    const tasksFromSessions: TaskPreview[] = sessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      last: s.last || '(brak wiadomości)',
      date: new Date(s.timestamp).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: s.timestamp,
    }))

    // 🔗 Połącz obie listy (unikalne ID, preferuj dane z sessions)
    const mergedTasks: TaskPreview[] = [
      ...tasksFromSessions,
      ...tasksFromChats.filter((t) => !tasksFromSessions.some((s) => s.id === t.id)),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 25)

    setTaskChats(mergedTasks)

    // 🎩 Six Hats
    const sixData = JSON.parse(localStorage.getItem('chat_six_hats') || '[]') as any[]
    const sixHats: ChatPreview[] = sixData
      .filter((m: any) => m.role === 'user')
      .map((m: any): ChatPreview => ({
        content: m.content,
        date: new Date(m.timestamp).toLocaleString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: m.timestamp || 0,
      }))
      .sort((a: ChatPreview, b: ChatPreview) => b.timestamp - a.timestamp)
      .slice(0, 15)
    setSixHatsChats(sixHats)

    // 🧠 Todoist Sessions
    const rawSessions = JSON.parse(localStorage.getItem('chat_sessions_todoist') || '[]') as any[]
    const sessionsData: TodoistSession[] = rawSessions
      .map((s: any): TodoistSession => {
        const messages = JSON.parse(localStorage.getItem(`chat_todoist_${s.id}`) || '[]') as any[]
        const lastMsg = messages[messages.length - 1]
        return {
          ...s,
          last: lastMsg?.content || '(brak wiadomości)',
        }
      })
      .sort((a: TodoistSession, b: TodoistSession) => b.timestamp - a.timestamp)
      .slice(0, 25)
    setTodoistSessions(sessionsData)
  }

  useEffect(() => {
    loadChats()
    window.addEventListener('storage', loadChats)
    window.addEventListener('chatUpdated', loadChats)
    return () => {
      window.removeEventListener('storage', loadChats)
      window.removeEventListener('chatUpdated', loadChats)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = (mode: 'global' | 'task' | 'six_hats' | 'todoist', session: any) => {
    setActiveSessionId(session.id)

    // zawsze informujemy rodzica aby przełączył główny widok
    onSelectChat?.(mode, { id: session.id, content: session.title || session.last || '' })

    // dla sesji dotyczących zadań dodatkowo wyślij dedykowane eventy
    if (mode === 'todoist' || mode === 'task') {
      const detail = {
        mode: 'todoist',
        task: { id: session.id, title: session.title || session.last || '', description: (session as any).description || '' },
      }
      // dispatch eventy które TodoistConnection nasłuchuje
      window.dispatchEvent(new CustomEvent('taskSelect', { detail }))
      // dodatkowy alias dla kompatybilności
      window.dispatchEvent(new CustomEvent('taskHelp', { detail }))
    }
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
            className={`flex-1 py-2 ${tab === t.key ? 'bg-white text-green-700 font-semibold' : 'hover:bg-gray-200'}`}
            onClick={() => setTab(t.key as any)}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {/* 🧠 TODOIST */}
        {tab === 'todoist' &&
          (todoistSessions.length === 0 ? (
            <p className="text-gray-500 italic">Brak historii Todoist.</p>
          ) : (
            todoistSessions.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelect('todoist', s)}
                title={s.last}
                className={`cursor-pointer border rounded-lg p-2 transition ${activeSessionId === s.id ? 'bg-green-100 border-green-300' : 'bg-white hover:bg-green-50'}`}
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

        {/* ✅ TASKI */}
        {tab === 'task' &&
          (taskChats.length === 0 ? (
            <p className="text-gray-500 italic">Brak rozmów z zadaniami.</p>
          ) : (
            taskChats.map((t) => (
              <div
                key={t.id}
                onClick={() => handleSelect('task', { id: t.id, title: t.title })}
                title={t.last}
                className={`cursor-pointer border rounded-lg p-2 transition ${activeSessionId === t.id ? 'bg-green-100 border-green-300' : 'bg-white hover:bg-green-50'}`}
              >
                <p className="font-medium text-gray-800 truncate">{t.title}</p>
                <p className="text-xs text-gray-500">{t.date}</p>
                <p className="text-xs text-gray-600 italic truncate">{t.last}</p>
              </div>
            ))
          ))}

        {/* 🎩 SIX HATS */}
        {tab === 'six_hats' &&
          (sixHatsChats.length === 0 ? (
            <p className="text-gray-500 italic">Brak rozmów Six Hats.</p>
          ) : (
            sixHatsChats.map((chat, i) => (
              <div
                key={i}
                onClick={() => handleSelect('six_hats', { id: `six_${i}`, title: chat.content })}
                title={chat.content}
                className={`cursor-pointer border rounded-lg p-2 transition ${activeSessionId === `six_${i}` ? 'bg-green-100 border-green-300' : 'bg-white hover:bg-green-50'}`}
              >
                <p className="text-xs text-gray-500">{chat.date}</p>
                <p className="truncate text-gray-800">{chat.content}</p>
              </div>
            ))
          ))}

        {/* 🌍 GLOBALNE */}
        {tab === 'global' &&
          (globalChats.length === 0 ? (
            <p className="text-gray-500 italic">Brak rozmów globalnych.</p>
          ) : (
            globalChats.map((chat, i) => (
              <div
                key={i}
                onClick={() => handleSelect('global', { id: `global_${i}`, title: chat.content })}
                title={chat.content}
                className={`cursor-pointer border rounded-lg p-2 transition ${activeSessionId === `global_${i}` ? 'bg-green-100 border-green-300' : 'bg-white hover:bg-green-50'}`}
              >
                <p className="text-xs text-gray-500">{chat.date}</p>
                <p className="truncate text-gray-800">{chat.content}</p>
              </div>
            ))
          ))}
      </div>
    </div>
  )
}
