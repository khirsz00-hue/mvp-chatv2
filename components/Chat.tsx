'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
  onSend?: (msg: string) => Promise<void> | void
  messages?: ChatMessage[]
  assistant?: 'global' | 'six_hats' | 'todoist'
  hideHistory?: boolean
  sessionId?: string
  contextTitle?: string
}

export default function Chat({
  onSend,
  messages: externalMessages = [],
  assistant = 'todoist',
  hideHistory = true,
  sessionId,
  contextTitle,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(externalMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastTasks, setLastTasks] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // ✅ Sync z zewnętrznymi wiadomościami
  useEffect(() => setMessages(externalMessages), [externalMessages])

  // 🔹 Klucz historii
  const storageKey =
    sessionId
      ? `chat_todoist_${sessionId}`
      : assistant === 'six_hats'
      ? 'chat_six_hats'
      : assistant === 'todoist'
      ? 'chat_todoist'
      : 'chat_global'

  // 💾 Wczytaj historię
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMessages(parsed)
        const last = parsed.findLast((m: any) => m.type === 'tasks')
        if (last?.tasks) setLastTasks(last.tasks)
      } catch (err) {
        console.error('❌ Błąd odczytu historii czatu:', err)
      }
    }
  }, [storageKey])

  // 💾 Zapisuj historię
  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, storageKey])

  // 🔽 Scroll na dół
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
      if (onSend) {
        await onSend(content)
        setIsLoading(false)
        return
      }

      const todoistToken = localStorage.getItem('todoist_token') || ''

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          token: todoistToken,
          tasks:
            content.toLowerCase().includes('pogrupuj') ||
            content.toLowerCase().includes('uporządkuj')
              ? lastTasks
              : undefined,
        }),
      })

      const data = await res.json()
      console.log('📩 Odpowiedź backendu (Chat):', data)

      if (data.type === 'tasks') setLastTasks(data.tasks)

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          data.content || data.reply || data.message || '🤖 Brak odpowiedzi od AI.',
        timestamp: Date.now(),
        type: data.type || 'text',
        tasks: data.tasks || [],
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
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

  const visibleMessages = hideHistory ? messages.slice(-20) : messages

  // 🧠 Kliknięcie w kartę zadań → otwiera modal
  const handleOpenTask = (task: any) => {
    const event = new CustomEvent('chatSelect', {
      detail: { mode: 'todoist', task },
    })
    window.dispatchEvent(event)
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* 🧩 KONTEKST */}
      {contextTitle && (
        <div className="px-4 py-2 bg-blue-50 border-b text-sm font-medium text-blue-700">
          💬 {contextTitle}
        </div>
      )}

      {/* 🧠 CZAT */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50 max-h-[calc(100vh-220px)]">
        <AnimatePresence>
          {visibleMessages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`p-3 rounded-xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'ml-auto bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              {/* 🧩 Treść */}
              {m.type !== 'tasks' && (
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                  {m.content}
                </ReactMarkdown>
              )}

              {/* ✅ Karty zadań */}
              {m.type === 'tasks' && (
                <div className="mt-2 space-y-2">
                  {m.tasks && m.tasks.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {m.tasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleOpenTask(t)}
                            className="cursor-pointer"
                          >
                            <TaskCard
                              task={{
                                id: t.id,
                                content: t.content,
                                due: t.due || undefined,
                                priority: t.priority,
                              }}
                              token={localStorage.getItem('todoist_token') || ''}
                              onAction={() => {}}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-right mt-3">
                        <button
                          onClick={() => sendMessage('Pogrupuj te zadania')}
                          className="px-3 py-1.5 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                        >
                          📂 Pogrupuj w bloki tematyczne
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

              {/* ⏱ Czas */}
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

        {isLoading && (
          <div className="flex justify-center items-center mt-3 text-gray-500 text-sm gap-1 animate-pulse">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce delay-100">●</span>
            <span className="animate-bounce delay-200">●</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ✍️ INPUT */}
      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Napisz np. 'Pogrupuj zadania'..."
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
