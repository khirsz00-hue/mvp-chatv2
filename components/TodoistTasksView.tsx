'use client'

import { useEffect, useState, useRef } from 'react'
import TodoistTasks from './TodoistTasks'

export default function TodoistTasksView({ token }: { token: string }) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7 days'>(
    () => (localStorage.getItem('todoist_filter') as any) || 'today'
  )
  const [tasks, setTasks] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const lastEvent = useRef<string>('')

  const handleRefresh = (updated?: any[]) => updated && setTasks(updated)

  // 💾 Zapamiętuj filtr lokalnie (żeby nie resetował się po re-renderze)
  useEffect(() => {
    localStorage.setItem('todoist_filter', filter)
  }, [filter])

  useEffect(() => {
    if (!token) return

    let es: EventSource | null = null

    const connectSSE = () => {
      try {
        es = new EventSource('/api/todoist/stream')
        console.log('📡 Połączono z Todoist streamem...')

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.event?.startsWith('item:')) {
              // 🧠 zapobieganie wielokrotnemu odświeżeniu przy tym samym evencie
              if (lastEvent.current === data.event) return
              lastEvent.current = data.event

              console.log('🔁 Otrzymano event Todoist:', data)
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

    // 🫀 Ping (utrzymuje połączenie lokalnie)
    const ping = setInterval(() => {
      fetch('/api/todoist/stream/ping').catch(() => {})
    }, 25000)

    // 🧩 Polling awaryjny (na Vercel)
    const poll = setInterval(() => {
      console.log('🔁 Polling Todoist – ciche odświeżenie listy')
      window.dispatchEvent(new Event('taskUpdated'))
    }, 30000)

    return () => {
      clearInterval(ping)
      clearInterval(poll)
      es?.close()
    }
  }, [token])

  return (
    <div className="flex h-full bg-gray-50 rounded-b-xl overflow-hidden relative">
      {/* 📋 Sekcja zadań */}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm animate-[fadeInUp_0.3s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  )
}
