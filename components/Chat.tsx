'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
  onSend: (msg: string) => Promise<void>
  messages: ChatMessage[]
  assistant?: 'global' | 'six_hats'
  hideHistory?: boolean
}

export default function Chat({
  onSend,
  messages,
  assistant = 'six_hats',
  hideHistory = true,
}: ChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const storageKey = assistant === 'six_hats' ? 'chat_six_hats' : 'chat_global'

  // 💾 Zapisuj wiadomości do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages))
      window.dispatchEvent(new Event('chatUpdated'))
    }
  }, [messages, storageKey])

  // 🔽 Auto-scroll do dołu
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const msg = input.trim()
    setInput('')
    await onSend(msg)
  }

  // 🔹 Jeśli `hideHistory` = true, pokazuj tylko ostatnie wiadomości (np. user + AI)
  const visibleMessages = hideHistory ? messages.slice(-8) : messages

  return (
    <div className="flex flex-col h-[70vh] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
                <div className="space-y-2 mt-1">
                  {m.tasks && m.tasks.length > 0 ? (
                    m.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg bg-gray-50 border border-gray-200 shadow-sm hover:bg-gray-100 transition"
                      >
                        <p className="font-medium text-gray-800">{t.content}</p>
                        <div className="text-xs text-gray-500 flex gap-2 mt-1">
                          {t.due && (
                            <span>📅 {new Date(t.due).toLocaleDateString('pl-PL')}</span>
                          )}
                          {t.priority && t.priority > 1 && (
                            <span>⭐ Priorytet: {t.priority}</span>
                          )}
                        </div>
                      </div>
                    ))
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
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            assistant === 'six_hats'
              ? 'Zadaj pytanie np. "Przeanalizuj problem metodą 6 kapeluszy..."'
              : 'Napisz wiadomość np. "Daj taski na dziś"'
          }
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
          onClick={handleSend}
        >
          Wyślij
        </button>
      </div>
    </div>
  )
}
