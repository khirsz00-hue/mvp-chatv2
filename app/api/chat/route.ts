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
    due?: string
    priority?: number
  }[]
}

interface ChatProps {
  onSend: (msg: string) => Promise<void>
  messages: ChatMessage[]
  assistant?: 'global' | 'six_hats' | 'todoist'
  hideHistory?: boolean
  sessionId?: string
}

export default function Chat({
  onSend,
  messages,
  assistant = 'six_hats',
  hideHistory = true,
  sessionId,
}: ChatProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const storageKey = sessionId
    ? `chat_session_${sessionId}`
    : assistant === 'six_hats'
    ? 'chat_six_hats'
    : assistant === 'todoist'
    ? 'chat_todoist'
    : 'chat_global'

  // 💾 Zapisuj wiadomości do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages))
      window.dispatchEvent(new Event('chatUpdated'))
    }
  }, [messages, storageKey])

  // 🔽 Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')
    setLoading(true)
    await onSend(msg)
    setLoading(false)
  }

  const visibleMessages = hideHistory ? messages.slice(-8) : messages

  return (
    <div className="flex flex-col h-full max-h-[75vh] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
              {/* 🧠 Tekst */}
              {m.type !== 'tasks' && <div>{m.content}</div>}

              {/* ✅ Zadania */}
              {m.type === 'tasks' && (
                <div className="mt-2 space-y-3">
                  {/* 🔘 Przyciski akcji nad listą */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => handleSend('Pogrupuj tematycznie te zadania')}
                      className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition"
                    >
                      🧩 Pogrupuj tematycznie
                    </button>
                  </div>

                  {m.tasks && m.tasks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.tasks.map((t) => (
                        <motion.div
                          key={t.id}
                          whileHover={{ scale: 1.02 }}
                          className="p-3 rounded-lg border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition cursor-pointer"
                        >
                          <p className="font-medium text-gray-800">{t.content}</p>
                          <div className="text-xs text-gray-500 flex gap-2 mt-1">
                            {t.due && (
                              <span>📅 {new Date(t.due).toLocaleDateString('pl-PL')}</span>
                            )}
                            {t.priority && t.priority > 1 && (
                              <span>⭐ Priorytet {t.priority}</span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="italic text-gray-500 text-sm">Brak zadań do wyświetlenia.</p>
                  )}
                </div>
              )}

              {/* ⏱ Timestamp */}
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

        {loading && (
          <div className="flex justify-center items-center mt-4">
            <motion.div
              className="flex space-x-2"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
            </motion.div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 border-t flex gap-2 bg-white sticky bottom-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            assistant === 'six_hats'
              ? 'Zadaj pytanie np. "Przeanalizuj problem metodą 6 kapeluszy..."'
              : assistant === 'global'
              ? 'Napisz wiadomość np. "Daj taski na dziś"'
              : 'Zadaj pytanie o zadania Todoist...'
          }
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          disabled={loading}
          onClick={() => handleSend()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          Wyślij
        </button>
      </div>
    </div>
  )
}
