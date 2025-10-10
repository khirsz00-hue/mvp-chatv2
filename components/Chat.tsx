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
  const [isThinking, setIsThinking] = useState(false)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // 💾 Klucz historii czatu
  const storageKey = sessionId
    ? `chat_session_${sessionId}`
    : assistant === 'six_hats'
    ? 'chat_six_hats'
    : assistant === 'todoist'
    ? 'chat_todoist'
    : 'chat_global'

  // 📦 Wczytanie historii przy starcie lub zmianie asystenta
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setLocalMessages(JSON.parse(saved))
      } catch {
        console.warn('❌ Nie udało się wczytać historii czatu.')
      }
    } else {
      setLocalMessages([])
    }
  }, [storageKey])

  // 💾 Zapisuj wiadomości do localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages))
      setLocalMessages(messages)
    }
  }, [messages, storageKey])

  // 🔽 Auto-scroll do dołu
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (msg: string) => {
    if (!msg.trim()) return
    setInput('')
    setIsThinking(true)
    await onSend(msg)
    setIsThinking(false)
  }

  const handleClearHistory = () => {
    localStorage.removeItem(storageKey)
    setLocalMessages([])
    window.dispatchEvent(new Event('chatUpdated'))
  }

  const quickCommands = [
    'Daj taski na dziś',
    'Daj taski na ten tydzień',
    'Daj taski na ten miesiąc',
    'Pokaż taski przeterminowane',
  ]

  const visibleMessages = hideHistory ? messages.slice(-8) : messages

  return (
    <div className="flex flex-col h-full max-h-[80vh] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* 🔘 Pasek komend + czyszczenie */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((label) => (
            <button
              key={label}
              onClick={() => handleSend(label)}
              className="px-3 py-1 text-xs font-medium rounded-full bg-white hover:bg-gray-200 border border-gray-300 transition"
            >
              {label}
            </button>
          ))}
        </div>

        {/* 🧹 Wyczyść czat */}
        <button
          onClick={handleClearHistory}
          className="text-xs text-gray-600 hover:text-red-600 transition"
          title="Usuń historię czatu"
        >
          🧹 Wyczyść
        </button>
      </div>

      {/* CZAT */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50">
        <AnimatePresence>
          {(visibleMessages.length > 0 ? visibleMessages : localMessages).map((m) => (
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
              {/* 🧠 Tekst markdown */}
              {m.type !== 'tasks' && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className={`prose prose-sm max-w-none ${
                    m.role === 'user'
                      ? 'text-white prose-strong:text-white prose-headings:text-white'
                      : 'text-gray-800 prose-a:text-blue-600'
                  }`}
                >
                  {m.content}
                </ReactMarkdown>
              )}

              {/* ✅ Zadania jako karty */}
              {m.type === 'tasks' && (
                <div className="space-y-2 mt-2 relative border-t pt-2">
                  {m.tasks && m.tasks.length > 0 ? (
                    <>
                      {/* Lista TaskCards */}
                      <div className="grid gap-2">
                        {m.tasks.map((t) => (
                          <TaskCard
                            key={t.id}
                            task={{
                              id: t.id,
                              content: t.content,
                              due: t.due || undefined,
                              priority: t.priority,
                            }}
                            token={''}
                            onAction={() => {}}
                            selectable={false}
                            selected={false}
                            onSelectChange={() => {}}
                          />
                        ))}
                      </div>

                      {/* 🔘 Przycisk pogrupowania */}
                      <div className="mt-3 text-center">
                        <button
                          onClick={() => handleSend('Pogrupuj te zadania w tematyczne bloki')}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
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

        {/* 🔄 Loader */}
        {isThinking && (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-3 animate-pulse">
            <svg
              className="animate-spin h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <span>AI myśli...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 border-t flex gap-2 bg-white sticky bottom-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
          onClick={() => handleSend(input)}
          disabled={isThinking}
        >
          Wyślij
        </button>
      </div>
    </div>
  )
}
