'use client'

import { useEffect, useState } from 'react'
import GlobalDialog from './GlobalDialog'
import TaskDialog from './TaskDialog'

interface ChatSidebarProps {
  onSelectChat?: (mode: 'global' | 'task', task?: { id: string; content: string }) => void
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [tab, setTab] = useState<'global' | 'task'>('global')
  const [globalChats, setGlobalChats] = useState<{ content: string; date: string }[]>([])
  const [taskChats, setTaskChats] = useState<
    { id: string; title: string; last: string; date: string }[]
  >([])
  const [openChat, setOpenChat] = useState<{ mode: 'global' | 'task'; id?: string; title?: string } | null>(null)

  // 🔄 Wczytaj dane po załadowaniu
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadChats = () => {
      // 🧠 Globalne rozmowy
      const global = JSON.parse(localStorage.getItem('chat_global') || '[]')
        .filter((m: any) => m.role === 'user')
        .slice(-5)
        .reverse()
        .map((m: any) => ({
          content: m.content,
          date: new Date().toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
        }))
      setGlobalChats(global)

      // 📋 Rozmowy z zadaniami
      const tasks = Object.keys(localStorage)
        .filter(k => k.startsWith('chat_task_'))
        .map(k => {
          const chat = JSON.parse(localStorage.getItem(k) || '[]')
          const last = chat[chat.length - 1]?.content || '(brak wiadomości)'
          const id = k.replace('chat_task_', '')
          const title = localStorage.getItem(`task_title_${id}`) || 'Zadanie bez nazwy'
          const date = new Date().toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
          return { id, title, last, date }
        })
        .reverse()
        .slice(0, 10)
      setTaskChats(tasks)
    }

    loadChats()

    // ⏱ automatyczne odświeżenie po zapisie nowego czatu
    window.addEventListener('storage', loadChats)
    window.addEventListener('chatUpdated', loadChats)
    return () => {
      window.removeEventListener('storage', loadChats)
      window.removeEventListener('chatUpdated', loadChats)
    }
  }, [])

  // 🧭 Po kliknięciu w czat – otwórz modal lub przekaż do zewnętrznego handlera
  const handleOpenChat = (mode: 'global' | 'task', task?: { id: string; content: string }) => {
    if (onSelectChat) onSelectChat(mode, task)
    else {
      if (mode === 'global') setOpenChat({ mode })
      else if (task) setOpenChat({ mode, id: task.id, title: task.content })
    }
  }

  return (
    <>
      {/* 🧩 Sidebar */}
      <div className="w-[260px] border-r border-gray-200 bg-gray-50 flex flex-col h-full">
        {/* 🏷️ Nagłówek */}
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
        </div>

        {/* 📜 Lista */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tab === 'global' ? (
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
          ) : taskChats.length === 0 ? (
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
          )}
        </div>
      </div>

      {/* 💬 Modal czatu */}
      {openChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3"
          onClick={() => setOpenChat(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-fadeIn max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">
                {openChat.mode === 'global' ? '💬 Globalny czat' : `💬 ${openChat.title}`}
              </h2>
              <button
                onClick={() => setOpenChat(null)}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                ✕ Zamknij
              </button>
            </div>

            {openChat.mode === 'global' ? (
              <GlobalDialog onClose={() => setOpenChat(null)} />
            ) : (
              <TaskDialog
                task={{
                  id: openChat.id || '',
                  content: openChat.title || '',
                }}
                mode="help"
                onClose={() => setOpenChat(null)}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
