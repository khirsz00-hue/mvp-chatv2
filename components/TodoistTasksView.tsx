'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'

export default function TodoistTasksView({
  token,
  onUpdate,
}: {
  token: string
  onUpdate?: () => void
}) {
  const [filter, setFilter] = useState<
    'today' | 'tomorrow' | 'overdue' | '7 days' | '30 days' | 'week-view'
  >(() =>
    typeof window !== 'undefined'
      ? ((localStorage.getItem('todoist_filter') as any) || 'today')
      : 'today'
  )

  const [tasks, setTasks] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const lastEvent = useRef<number>(0)
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list')

  const handleRefresh = (updated?: any[]) => {
    if (updated) setTasks(updated)
    onUpdate?.() // ✅ wywołanie callbacka z TodoistConnection
  }

  // 💾 Zapamiętaj filtr
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('todoist_filter', filter)
    }
  }, [filter])

  // 🔁 SSE + Webhook + Polling
  useEffect(() => {
    if (!token) return
    console.log('🚀 Uruchomiono Todoist listener...')

    let es: EventSource | null = null
    let lastWebhookTime = 0

    const connectSSE = () => {
      try {
        es = new EventSource('/api/todoist/stream')
        console.log('📡 Połączono z Todoist streamem...')

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.event?.startsWith('item:')) {
              const now = Date.now()
              if (data.event === 'item:added') {
                // ⏱ lekkie opóźnienie po dodaniu zadania
                setTimeout(() => {
                  console.log('🕒 Odświeżenie po dodaniu nowego zadania')
                  window.dispatchEvent(new Event('taskUpdated'))
                  onUpdate?.()
                }, 1500)
              } else if (now - lastEvent.current > 1500) {
                lastEvent.current = now
                window.dispatchEvent(new Event('taskUpdated'))
                onUpdate?.()
              }

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

    // 🫀 Ping utrzymujący połączenie
    const ping = setInterval(() => {
      fetch('/api/todoist/stream/ping').catch(() => {})
    }, 25000)

    // 🧩 Webhook checker
    const checkWebhook = async () => {
      try {
        const res = await fetch('/api/todoist/webhook')
        const data = await res.json()
        if (data.lastEventTime && data.lastEventTime > lastWebhookTime) {
          lastWebhookTime = data.lastEventTime
          console.log('🔔 Webhook Todoist – odświeżam')
          window.dispatchEvent(new Event('taskUpdated'))
          onUpdate?.()
          setToast('🔄 Lista zadań zaktualizowana')
          setTimeout(() => setToast(null), 2000)
        }
      } catch {
        // ciche błędy
      }
    }
    const webhookInterval = setInterval(checkWebhook, 5000)

    // 🧩 Polling awaryjny co 45 s
    const poll = setInterval(() => {
      console.log('🪄 Polling Todoist – ciche odświeżenie')
      window.dispatchEvent(new Event('taskUpdated'))
      onUpdate?.()
    }, 45000)

    return () => {
      clearInterval(ping)
      clearInterval(poll)
      clearInterval(webhookInterval)
      es?.close()
    }
  }, [token])

  return (
    <div className="flex h-full bg-gray-50 rounded-b-xl overflow-hidden relative">
      {/* 📋 Sekcja zadań */}
      <div className="flex-1 flex flex-col">
        {/* 🔘 Górny pasek widoku */}
        <div className="flex justify-between items-center px-3 py-2 border-b bg-white shadow-sm">
          <div className="flex gap-2">
            {[
              { key: 'today', label: 'Dziś' },
              { key: 'tomorrow', label: 'Jutro' },
              { key: '7 days', label: 'Tydzień' },
              { key: '30 days', label: 'Miesiąc' },
              { key: 'overdue', label: 'Przeterminowane' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key as any)
                  setViewMode(f.key === '7 days' ? 'week' : 'list')
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 overflow-visible">
          <div className="max-h-[calc(100vh-150px)] overflow-y-auto rounded-xl">
            {viewMode === 'week' ? (
              <WeekView tasks={tasks} />
            ) : (
              <TodoistTasks
                token={token}
                filter={filter === 'week-view' ? '7 days' : filter} // ✅ fallback
                onChangeFilter={setFilter}
                onUpdate={handleRefresh}
              />
            )}
          </div>
        </div>
      </div>

      {/* 🔔 Toast powiadomień */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
