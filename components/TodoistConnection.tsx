'use client'

import { useState } from 'react'
import TodoistTasks from './TodoistTasks'
import ChatDock from './ChatDock'
import GlobalChat from './GlobalChat'
import ChatSidebar from './ChatSidebar'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
}

export default function TodoistConnection({ token, onDisconnect }: TodoistConnectionProps) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days'>('today')
  const [tasks, setTasks] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<'global' | 'task'>('global')
  const [activeTask, setActiveTask] = useState<any | null>(null)

  // 🔁 Odświeżanie listy
  const handleRefresh = (updated?: any[]) => {
    if (updated) setTasks(updated)
  }

  // 🧭 Otwieranie czatu zadania
  const openTaskChat = (task: any) => {
    setActiveChat('task')
    setActiveTask(task)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`task_title_${task.id}`, task.content)
    }
  }

  const backToGlobalChat = () => {
    setActiveChat('global')
    setActiveTask(null)
  }

  // 🧠 Komendy globalne (dla asystenta)
  const handleChatCommand = async (message: string) => {
    const text = message.toLowerCase()
    if (text.includes('dzisiaj')) return setFilter('today')
    if (text.includes('jutro')) return setFilter('tomorrow')
    if (text.includes('tydzień')) return setFilter('7 days')
    if (text.includes('zaległe')) return setFilter('overdue')

    alert('🤖 Nie rozumiem tej komendy jeszcze.')
  }

  // 🧩 Grupowanie
  const groupTasks = (mode: 'topics' | 'project') =>
    alert(mode === 'topics' ? '🧩 Grupowanie tematyczne — w przygotowaniu.' : '📂 Grupowanie wg projektu — w przygotowaniu.')

  // 🧠 Wybór czatu z sidebaru
  const handleSelectChat = (mode: 'global' | 'task', task?: { id: string; content: string }) => {
    if (mode === 'global') backToGlobalChat()
    else if (task) setActiveChat('task'), setActiveTask(task)
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-gray-50 border border-green-200 rounded-xl overflow-hidden">
      {/* 🟪 SIDEBAR */}
      <ChatSidebar onSelectChat={handleSelectChat} />

      {/* 🟩 MAIN */}
      <div className="flex flex-col flex-1 bg-white">
        {/* HEADER */}
        <div className="flex justify-between items-center p-3 border-b bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-700">✅ Połączono z Todoist</span>
            <button
              onClick={onDisconnect}
              className="text-xs px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition"
            >
              Odłącz
            </button>
          </div>
        </div>

        {/* FILTRY */}
        <div className="flex justify-between items-center px-3 py-2 border-b bg-green-50 sticky top-[42px] z-10">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'today', label: '📅 Dzisiaj' },
              { key: 'tomorrow', label: '➡️ Jutro' },
              { key: '7 days', label: '🗓️ Tydzień' },
              { key: 'overdue', label: '⚠️ Przeterminowane' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-1 text-xs md:text-sm rounded-lg transition ${
                  filter === key ? 'bg-green-600 text-white' : 'bg-white border text-green-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex gap-2">
            <button
              onClick={() => groupTasks('topics')}
              className="px-3 py-1 text-sm rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-100 transition"
            >
              🧩 Tematycznie
            </button>
            <button
              onClick={() => groupTasks('project')}
              className="px-3 py-1 text-sm rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-100 transition"
            >
              📂 Projekty
            </button>
          </div>
        </div>

        {/* 🧾 TREŚĆ: lista zadań + czat */}
        <div className="flex flex-col h-full">
          {/* LISTA ZADAŃ */}
          <div className="flex-1 overflow-y-auto p-3">
            <TodoistTasks
              token={token}
              filter={filter}
              onChangeFilter={setFilter}
              onUpdate={handleRefresh}
              onOpenTaskChat={openTaskChat}
            />
          </div>

          {/* 💬 CZAT — zawsze widoczny */}
          <div className="border-t bg-white p-3 sticky bottom-0">
            {activeChat === 'global' && (
              <GlobalChat token={token} tasks={tasks} onOpenTaskChat={openTaskChat} />
            )}
            {activeChat === 'task' && activeTask && (
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700 truncate max-w-[80%]">
                    💬 {activeTask.content}
                  </span>
                  <button
                    onClick={backToGlobalChat}
                    className="text-xs text-gray-500 hover:text-gray-700 transition"
                  >
                    ← Wróć
                  </button>
                </div>
                <ChatDock mode="task" task={activeTask} token={token} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
