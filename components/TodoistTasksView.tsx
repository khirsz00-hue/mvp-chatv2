'use client'

import { useEffect, useState } from 'react'
import TodoistTasks from './TodoistTasks'

export default function TodoistTasksView({ token }: { token: string }) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days'>('today')
  const [tasks, setTasks] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const handleRefresh = (updated?: any[]) => updated && setTasks(updated)

  // 🔁 Słuchanie webhook streamu Todoist (SSE)
  useEffect(() => {
    const es = new EventSource('/api/todoist/stream')

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event?.startsWith('item:')) {
          console.log('🔁 Aktualizacja Todoist:', data.event)
          window.dispatchEvent(new Event('taskUpdated'))
          setToast('🔄 Lista zadań zaktualizowana')
          setTimeout(() => setToast(null), 2500)
        }
      } catch (err) {
        console.error('Błąd streamu Todoist:', err)
      }
    }

    es.onerror = (err) => {
      console.warn('⚠️ Błąd połączenia SSE, ponawianie...', err)
    }

    return () => es.close()
  }, [])

  return (
    <div className="flex h-full bg-gray-50 rounded-b-xl overflow-hidden relative">
      {/* 📋 Główna sekcja */}
      <div className="flex-1 flex flex-col">
        {/* 🗒️ Lista zadań */}
        <div className="flex-1 overflow-y-auto p-3">
          <TodoistTasks
            token={token}
            filter={filter}
            onChangeFilter={setFilter}
            onUpdate={handleRefresh}
          />
        </div>
      </div>

      {/* ✅ Toast powiadomień */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-[fadeInUp_0.3s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  )
}
