'use client'

import { useEffect, useState } from 'react'
import GlobalDialog from './GlobalDialog'
import TaskDialog from './TaskDialog'

interface ChatSidebarProps {
  onSelectChat?: (mode: 'global' | 'task' | 'six_hats', task?: { id: string; content: string }) => void
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [tab, setTab] = useState<'global' | 'task' | 'six_hats'>('global')
  const [globalChats, setGlobalChats] = useState<{ content: string; date: string }[]>([])
  const [taskChats, setTaskChats] = useState<
    { id: string; title: string; last: string; date: string }[]
  >([])
  const [sixHatsChats, setSixHatsChats] = useState<{ content: string; date: string }[]>([])
  const [openChat, setOpenChat] = useState<{ mode: 'global' | 'task' | 'six_hats'; id?: string; title?: string } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadChats = () => {
      // 🌍 Globalne rozmowy
      const global = JSON.parse(localStorage.getItem('chat_global') || '[]')
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
        .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp)
        .slice(0, 10)
      setGlobalChats(global)

      // ✅ Zadania (Todoist)
      const tasks = Object.keys(localStorage)
        .filter(k => k.startsWith('chat_task_'))
        .map(k => {
          const chat = JSON.parse(localStorage.getItem(k) || '[]')
          const lastMsg = chat[chat.length - 1]
          const id = k.replace('chat_task_', '')
          const title = localStorage.getItem(`task_title_${id}`) || 'Zadanie bez nazwy'

          return {
            id,
            title,
            last: lastMsg?.content || '(brak wiadomości)',
            date: lastMsg?.timestamp
              ? new Date(lastMsg.timestamp).toLocaleString('pl-PL', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'brak daty',
            timestamp: lastMsg?.timestamp || 0,
          }
        })
        .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp)
        .slice(0, 10)
      setTaskChats(tasks)

      // 🎩 Six Hats rozmowy
      const sixHats = JSON.parse(localStorage.getItem('chat_six_hats') || '[]')
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
        .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp)
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

  const handleOpenChat = (mode: 'global' | 'task' | 'six_hats', task?: { id: string; content: string }) => {
    if (onSelectChat) onSelectChat(mode, task)
    else {
      if (mode === 'global' || mode === 'six_hats') setOpenChat({ mode })
      else if (task) setOpenChat({ mode, id: task.id, title: task.content })
      setTimeout(() => setIsVisible(true), 20)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => setOpenChat(null), 250)
  }

  return (
    <>
      {/* 🧭 Sidebar */}
      <div className="w-[260px] border-r border-gray-200 bg-gray-50 flex flex-col h-full">
        <div className="p-3 border-b bg-white flex justify-between items-center">
          <h2 className="font-semibold text-gray-700 text-sm">💬 Historia czatów</h2>
        </div>

        {/* 🔘 Przełącznik */}
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

        {/* 📋 Lista rozmów */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tab === 'global' && (
            globalChats.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Brak rozmów globalnych.</p>
            ) : (
              globalChats.map((chat, i) => (
                <div
                  key={i}
                  onClick={() => handleOpenChat('global')}
                  className="cursor-pointer border rounded-lg p-2 bg-white hover:bg-green-50 transition"
                >
                  <p className="text-xs text-gray-500">{chat.date}</p>
                  <p className="text-sm text-gray-800 truncate">{chat.content}</p>
                </div>
              ))
            )
          )}

          {tab === 'task' && (
            taskChats.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Brak rozmów z zadaniami.</p>
            ) : (
              taskChats.map((t, i) => (
                <div
                  key={i}
                  onClick={() => handleOpenChat('task', { id: t.id, content: t.title })}
                  className="cursor-pointer border rounded-lg p-2 bg-white hover:bg-green-50 transition"
                >
                  <p className="font-medium text-gray-800 text-sm truncate">{t.title}</p>
                  <p className="text-xs text-gray-500">{t.date}</p>
                  <p className="text-xs text-gray-600 italic line-clamp-2">{t.last}</p>
                </div>
              ))
            )
          )}

          {tab === 'six_hats' && (
            sixHatsChats.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Brak rozmów Six Hats.</p>
            ) : (
              sixHatsChats.map((chat, i) => (
                <div
                  key={i}
                  onClick={() => handleOpenChat('six_hats')}
                  className="cursor-pointer border rounded-lg p-2 bg-white hover:bg-green-50 transition"
                >
                  <p className="text-xs text-gray-500">{chat.date}</p>
                  <p className="text-sm text-gray-800 truncate">{chat.content}</p>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* 💬 Wysuwany panel czatu */}
      {openChat && (
        <div
          className={`fixed inset-0 z-50 flex items-stretch bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose}
        >
          <div
            className={`bg-white w-full max-w-lg h-full shadow-2xl border-r border-gray-200 transform transition-transform duration-300 ${
              isVisible ? 'translate-x-0' : '-translate-x-full'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 truncate">
                {openChat.mode === 'global'
                  ? '💬 Globalny czat'
                  : openChat.mode === 'six_hats'
                  ? '🎩 Six Hats Assistant'
                  : `💬 ${openChat.title}`}
              </h2>
              <button
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {openChat.mode === 'global' ? (
                <GlobalDialog onClose={handleClose} />
              ) : openChat.mode === 'six_hats' ? (
                <GlobalDialog onClose={handleClose} assistant="six_hats" />
              ) : (
                <TaskDialog
                  task={{
                    id: openChat.id || '',
                    content: openChat.title || '',
                  }}
                  mode="help"
                  onClose={handleClose}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
