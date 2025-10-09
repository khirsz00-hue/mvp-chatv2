'use client'

import { useState } from 'react'
import TodoistTasks from './TodoistTasks'
import ChatDock from './ChatDock'
import GlobalChat from './GlobalChat'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
}

export default function TodoistConnection({ token, onDisconnect }: TodoistConnectionProps) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days'>('today')
  const [tasks, setTasks] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<'global' | 'task'>('global')
  const [activeTask, setActiveTask] = useState<any | null>(null)

  // 🔄 Odświeżenie listy po zmianie
  const handleRefresh = (updated?: any[]) => {
    if (updated) setTasks(updated)
  }

  // 🧭 Otwieranie czatu dla konkretnego zadania
  const openTaskChat = (task: any) => {
    setActiveChat('task')
    setActiveTask(task)
  }

  const backToGlobalChat = () => {
    setActiveChat('global')
    setActiveTask(null)
  }

  // 🧠 Chat interpretujący polecenia globalne
  const handleChatCommand = async (message: string) => {
    const text = message.toLowerCase()

    if (text.includes('na dziś') || text.includes('dzisiaj')) {
      setFilter('today')
      return
    }

    if (text.includes('na jutro')) {
      setFilter('tomorrow')
      return
    }

    if (text.includes('tydzień') || text.includes('tygodniu')) {
      setFilter('7 days')
      return
    }

    if (text.includes('przeterminowane') || text.includes('zaległe')) {
      setFilter('overdue')
      return
    }

    if (text.includes('kolejność') || text.includes('kolejnosc')) {
      if (!tasks.length) {
        alert('Brak zadań do analizy.')
        return
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `
Zaproponuj optymalną kolejność wykonania tych zadań:
${tasks.map((t) => `- ${t.content}`).join('\n')}
Uwzględnij priorytety, terminy i logiczny sens.
          `.trim(),
        }),
      })

      const data = await res.json()
      alert(data.reply || 'Brak odpowiedzi od AI.')
      return
    }

    alert('🤖 Nie rozumiem tej komendy jeszcze.')
  }

  // 🧩 Grupowanie
  const groupTasks = (mode: 'topics' | 'project') => {
    if (mode === 'topics') {
      alert('🧩 Grupowanie tematyczne — w przygotowaniu.')
    } else {
      alert('📂 Grupowanie wg projektu — w przygotowaniu.')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 h-[calc(100vh-120px)] bg-gray-50 rounded-xl overflow-hidden border border-green-200">
      {/* 🟩 LEWA STRONA — LISTA ZADAŃ */}
      <div className="flex flex-col border-r border-green-200">
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
          <div className="flex gap-2">
            {[
              { key: 'today', label: '📅 Dzisiaj' },
              { key: 'tomorrow', label: '➡️ Jutro' },
              { key: '7 days', label: '🗓️ Tydzień' },
              { key: 'overdue', label: '⚠️ Przeterminowane' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  filter === key ? 'bg-green-600 text-white' : 'bg-white border text-green-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => groupTasks('topics')}
              className="px-3 py-1 text-sm rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-100 transition"
            >
              🧩 Pogrupuj tematycznie
            </button>
            <button
              onClick={() => groupTasks('project')}
              className="px-3 py-1 text-sm rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-100 transition"
            >
              📂 Pogrupuj wg projektu
            </button>
          </div>
        </div>

        {/* LISTA ZADAŃ */}
        <div className="flex-1 overflow-y-auto p-4">
          <TodoistTasks
            token={token}
            filter={filter}
            onChangeFilter={setFilter}
            onUpdate={handleRefresh}
            onOpenTaskChat={openTaskChat}
          />
        </div>
      </div>

      {/* 🟦 PRAWA STRONA — CZAT */}
      <div className="flex flex-col h-full bg-white">
        {activeChat === 'global' && (
          <GlobalChat token={token} tasks={tasks} onOpenTaskChat={openTaskChat} />
        )}
        {activeChat === 'task' && activeTask && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between border-b p-3 bg-gray-50">
              <h2 className="font-semibold text-gray-700 text-sm">
                💬 Pomoc z zadaniem: {activeTask.content}
              </h2>
              <button
                onClick={backToGlobalChat}
                className="text-xs text-gray-500 hover:text-gray-700 transition"
              >
                ← Wróć do głównego czatu
              </button>
            </div>
            <ChatDock mode="task" task={activeTask} token={token} />
          </div>
        )}
      </div>
    </div>
  )
}
