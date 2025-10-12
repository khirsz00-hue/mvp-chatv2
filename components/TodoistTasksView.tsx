'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TodoistTasks from './TodoistTasks'

export default function TodoistTasksView({ token }: { token: string }) {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'overdue' | '7days' | '30days'>(
    () =>
      typeof window !== 'undefined'
        ? ((localStorage.getItem('todoist_filter') as any) || 'today')
        : 'today'
  )
  const [tasks, setTasks] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const lastEvent = useRef<number>(0)

  const handleRefresh = (updated?: any[]) => {
    if (updated) setTasks(updated)
  }

  // 💾 Zapamiętuj filtr w localStorage
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

        es.onopen = () => console.log('✅ SSE: Połączenie aktywne')
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.event?.startsWith('item:')) {
              const now = Date.now()
              if (now - lastEvent.current > 1000) {
                lastEvent.current = now
                window.dispatchEvent(new Event('taskUpdated'))
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
              setTimeout(() => setToast(null), 2000)
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

    // 🧩 Webhook checker (Vercel)
    const checkWebhook = async () => {
      try {
        const res = await fetch('/api/todoist/webhook')
        const data = await res.json()
        if (data.lastEventTime && data.lastEventTime > lastWebhookTime) {
          lastWebhookTime = data.lastEventTime
          console.log('🔔 Webhook Todoist – odświeżam')
          window.dispatchEvent(new Event('taskUpdated'))
          setToast('🔄 Lista zadań zaktualizowana')
          setTimeout(() => setToast(null), 2000)
        }
      } catch {
        // ignorujemy błędy po stronie Vercela
      }
    }
    const webhookInterval = setInterval(checkWebhook, 6000)

    // 🧩 Polling awaryjny co 45 s
    const poll = setInterval(() => {
      console.log('🪄 Polling Todoist – ciche odświeżenie')
      window.dispatchEvent(new Event('taskUpdated'))
    }, 45000)

    return () => {
      clearInterval(ping)
      clearInterval(poll)
      clearInterval(webhookInterval)
      es?.close()
    }
  }, [token])

  // 📆 Naprawa filtra „today” – tylko dzisiejsze daty
  useEffect(() => {
    if (!tasks?.length) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    if (filter === 'today') {
      const onlyToday = tasks.filter((t) => {
        if (!t.due?.date) return false
        const due = new Date(t.due.date)
        return due >= today && due < tomorrow
      })
      setTasks(onlyToday)
    }
  }, [filter, tasks])

  return (
    <div className="flex h-full bg-gray-50 rounded-b-xl overflow-hidden relative">
      {/* 📋 Sekcja zadań */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-3 overflow-visible">
          <div className="max-h-[calc(100vh-150px)] overflow-y-auto rounded-xl relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
            <TodoistTasks
              token={token}
              filter={filter}
              onChangeFilter={setFilter}
              onUpdate={handleRefresh}
            />
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
