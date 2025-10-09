'use client'

import { useState } from 'react'
import TodoistTasks from './TodoistTasks'
import ChatDock from './ChatDock'

interface TodoistConnectionProps {
  token: string
  onDisconnect: () => void
}

export default function TodoistConnection({ token, onDisconnect }: TodoistConnectionProps) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'week'>('today')
  const [tasks, setTasks] = useState<any[]>([])

  // 🔄 Odświeżenie listy po zmianie
  const handleRefresh = (updated?: any[]) => {
    if (updated) setTasks(updated)
  }

  // 🧠 Chat interpretujący polecenia
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
      setFilter('week')
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
${tasks.map(t => `- ${t.content}`).join('\n')}
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

  // 🧩 Grupowanie w przyszłości
  const groupTasks = (mode: 'topics' | 'project') => {
    if (mode === 'topics') {
      alert('🧩 Grupowanie tematyczne — w przygotowaniu.')
    } else {
      alert('📂 Grupowanie wg projektu — w przygotowaniu.')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-gray-50 rounded-xl shadow-inner overflow-hidden border border-green-200">
      {/* 🟢 HEADER */}
      <div className="flex justify-between items-center p-3 border-b bg-white sticky top-0 z-10">
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

      {/* 🧭 PRZYCISKI FILTRÓW */}
      <div className="flex justify-between items-center px-3 py-2 border-b bg-green-50 sticky top-[42px] z-9">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1 text-sm rounded-lg transition ${
              filter === 'today' ? 'bg-green-600 text-white' : 'bg-white border text-green-700'
            }`}
          >
            📅 Dzisiaj
          </button>
          <button
            onClick={() => setFilter('tomorrow')}
            className={`px-3 py-1 text-sm rounded-lg transition ${
              filter === 'tomorrow' ? 'bg-green-600 text-white' : 'bg-white border text-green-700'
            }`}
          >
            ➡️ Jutro
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-3 py-1 text-sm rounded-lg transition ${
              filter === 'week' ? 'bg-green-600 text-white' : 'bg-white border text-green-700'
            }`}
          >
            🗓️ Tydzień
          </button>
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

      {/* ✅ LISTA ZADAŃ */}
      <div className="flex-1 overflow-y-auto p-4">
        <TodoistTasks token={token} filter={filter} onChangeFilter={setFilter} onUpdate={handleRefresh} />
      </div>

      {/* 💬 CZAT DOCK */}
      <div className="border-t bg-white p-3 sticky bottom-0">
        <ChatDock onSend={handleChatCommand} />
      </div>
    </div>
  )
}
