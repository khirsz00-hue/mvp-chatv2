'use client'

import { useEffect, useState } from 'react'
import TodoistTasks from './TodoistTasks'

export default function TodoistTasksView({ token }: { token: string }) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days'>('today')
  const [tasks, setTasks] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const handleRefresh = (updated?: any[]) => updated && setTasks(updated)

  useEffect(() => {
    if (!token) return

    let es: EventSource | null = null

    // 📡 Połączenie SSE (działa lokalnie, na Vercel może być ubijane)
    const connectSSE = () => {
      try {
        es = new EventSource('/api/todoist/stream')
        console.log('📡 Połączono z Todoist streamem...')

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.event?.startsWith('item:')) {
              console.log('🔁 Otrzymano event Todoist:', data)

              // 🔄 Odświeżenie listy
              window.dispatchEvent(new Event('taskUpdated'))

              const msg =
                data.event === 'item:added'
                  ? '🆕 Dodano nowe zadanie'
                  : data.event === 'item:completed'
                  ? '✅ Zadanie ukończone'
                  : data.event === 'item:updated'
                  ? '✏️ Zmieniono zadanie'
                  : '🔄 Lista zadań zaktualizowana'

              setToast(msg)
              setTimeout(() => setToast(null), 2500)
            }
          } catch (err) {
            console.error('❌ Błąd parsowania SSE:', err)
          }
        }

        es.onerror = (err) => {
          console.warn('⚠️ Błąd SSE, ponowne łączenie za 5s...', err)
          es?.close()
          setTimeout(connectSSE, 5000)
        }
      } catch (err) {
        console.warn('❌ Nie udało się połączyć z SSE:', err)
      }
    }

    connectSSE()

    // 🫀 Ping (utrzymuje połączenie przy życiu lokalnie)
    const ping = setInterval(() => {
      fetch('/api/todoist/stream/ping').catch(() => {})
    }, 25000)

    // 🔁 Polling zapasowy (działa zawsze, również na Vercel)
    const poll = setInterval(() => {
      console.log('🔁 Polling Todoist – odświeżenie listy')
      window.dispatchEvent(new Event('taskUpdated'))
    }, 5000)

    return () => {
      clearInterval(ping)
      clearInterval(poll)
      es?.close()
    }
  }, [token])

  return (
    <div className="flex h-full bg-gray-50 rounded-b-xl overflow-hidden relative">
      {/* 📋 Główna sekcja */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-3">
          <TodoistTasks
            token={token}
            filter={filter}
            onChangeFilter={setFilter}
            onUpdate={handleRefresh}
          />
        </div>
      </div>

      {/* 🔔 Toast powiadomień */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-[fadeInUp_0.3s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  )
}
