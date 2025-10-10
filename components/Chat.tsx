'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TaskCard from './TaskCard'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  type?: 'text' | 'tasks'
  tasks?: {
    id: string
    content: string
    due?: string | null
    priority?: number
  }[]
}

interface ChatProps {
  onSend?: (msg: string) => Promise<void>
  messages?: ChatMessage[]
  assistant?: 'global' | 'six_hats' | 'todoist'
  hideHistory?: boolean
  sessionId?: string
}

export default function Chat({
  onSend,
  messages: externalMessages = [],
  assistant = 'todoist',
  hideHistory = true,
  sessionId,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(externalMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastTasks, setLastTasks] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // 💾 Klucz historii zależny od asystenta
  const storageKey = sessionId
    ? `chat_session_${sessionId}`
    : assistant === 'six_hats'
    ? 'chat_six_hats'
    : assistant === 'todoist'
    ? 'chat_todoist'
    : 'chat_global'

  // 💾 Ładowanie historii po wejściu
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved)
      setMessages(parsed)
      if (parsed.length > 0) {
        const last = parsed.findLast((m: any) => m.type === 'tasks')
        if (last?.tasks) setLastTasks(last.tasks)
      }
    }
  }, [storageKey])

  // 💾 Zapis historii
  useEffect(() => {
    if (messages.length > 0)
      localStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, storageKey])

  // 🔽 Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ✉️ Wysyłanie wiadomości
  const sendMessage = async (msg?: string) => {
    const content = msg || input.trim()
    if (!content) return
    setInput('')
    setIsLoading(true)

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          tasks:
            content.toLowerCase().includes('pogrupuj') ||
            content.toLowerCase().includes('uporządkuj')
              ? lastTasks
              : undefined,
        }),
      })

      const data = await res.json()

      if (data.type === 'tasks') {
        setLastTasks(data.tasks)
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || data.reply || '',
        timestamp: Date.now(),
        type: data.type || 'text',
        tasks: data.tasks || [],
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error('❌ Błąd komunikacji:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Wystąpił błąd podczas komunikacji z AI.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // 🧹 Wyczyść historię
  const clearHistory = () => {
    localStorage.removeItem(storageKey)
    setMessages([])
    setLastTasks([])
  }

  // 🔹 Widoczne wiadomości
  const visibleMessages = hideHistory ? messages.slice(-12) : messages

  return (
    <div className="flex flex-col h-full max-h-[75vh] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* 🔘 Przyciski akcji */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-white sticky top-0 z-10">
        <button
          onClick={() => sendMessage('Daj taski na dziś')}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
        >
          Daj taski na dziś
        </button>
        <button
          onClick={() => sendMessage('Daj taski na ten tydzień')}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
        >
          Daj taski na ten tydzień
        </button>
        <button
          onClick={() => sendMessage('Daj taski na ten miesiąc')}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
        >
          Daj taski na ten miesiąc
        </button>
        <button
          onClick={() => sendMessage('Pokaż taski przeterminowane')}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
        >
          Pokaż taski przeterminowane
        </button>
        <button
          onClick={clearHistory}
          className="ml-auto px-3 py-1.5 text-sm rounded-md bg-red-100 text-red-700 hover:bg-red-200"
        >
          🧹 Wyczyść
        </button>
      </div>

      {/* CZAT */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50">
        <AnimatePresence>
          {visibleMessages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3 rounded-xl max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              {/* 🧠 Wiadomości tekstowe */}
              {m.type !== 'tasks' && <div>{m.content}</div>}

              {/* ✅ Wiadomości z zadaniami */}
              {m.type === 'tasks' && (
                <div className="mt-2 space-y-2">
                  {(m.tasks?.length || 0) > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(m.tasks || []).map((t) => (
                          <TaskCard
                            key={t.id}
                            task={{
                              id: t.id,
                              content: t.content,
                              due: t.due || undefined,
                              priority: t.priority,
                            }}
                            token=""
                            onAction={() => {}}
                          />
                        ))}
                      </div>
                      <div className="text-right mt-3">
                        <button
                          onClick={() => sendMessage('Pogrupuj te zadania')}
                          className="px-3 py-1.5 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          📂 Pogrupuj w tematyczne bloki
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="italic text-gray-500 text-sm">
                      Brak zadań do wyświetlenia.
                    </p>
                  )}
                </div>
              )}

              {/* ⏱ Czas wiadomości */}
              <div
                className={`text-[10px] mt-1 opacity-60 text-right ${
                  m.role === 'user' ? 'text-white' : 'text-gray-500'
                }`}
              >
                {new Date(m.timestamp).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loader */}
        {isLoading && (
          <div className="flex justify-center items-center mt-2 text-gray-500 text-sm gap-1 animate-pulse">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce delay-100">●</span>
            <span className="animate-bounce delay-200">●</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 border-t flex gap-2 bg-white sticky bottom-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Napisz np. 'Daj taski na dziś' lub 'Pogrupuj te zadania'"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          disabled={isLoading}
          onClick={() => sendMessage()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          Wyślij
        </button>
      </div>
    </div>
  )
}
