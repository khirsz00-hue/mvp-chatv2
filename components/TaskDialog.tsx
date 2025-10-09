'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  task: any
  mode: 'none' | 'help'
  onClose: () => void
}

export default function TaskDialog({ task, mode, onClose }: Props) {
  const storageKey = `chat_${task?.id || task?.content?.slice(0, 30)}`
  const [chat, setChat] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 🧩 Wczytaj historię rozmowy z localStorage tylko raz
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setChat(JSON.parse(saved))
  }, [storageKey])

  // 💾 Zapisz każdą zmianę rozmowy
  useEffect(() => {
    if (chat.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(chat))
    }
  }, [chat, storageKey])

  // 🔽 Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat, loading])

  const sendMessage = async () => {
    const userMessage = input.trim()
    if (!userMessage || loading) return

    const newMessage = { role: 'user' as const, content: userMessage }
    setChat(prev => [...prev, newMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: task?.content || '',
        }),
      })

      if (!res.ok) throw new Error('Błąd odpowiedzi z API')
      const data = await res.json()
      const reply = typeof data.reply === 'string' ? data.reply.trim() : '⚠️ Brak odpowiedzi od modelu.'

      setChat(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setChat(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ Wystąpił błąd podczas komunikacji z AI.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (mode !== 'help') return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col border border-gray-200 overflow-hidden animate-fadeIn max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Pomoc z zadaniem</h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            ✕ Zamknij
          </button>
        </div>

        {/* CZAT */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
          {chat.length === 0 && (
            <div className="bg-white p-3 rounded-lg shadow-sm border text-sm text-gray-800 leading-relaxed">
              🧠 Zajmijmy się zadaniem: <b>"{task.content}"</b>.<br />
              Na czym dokładnie ono polega? Co chcesz osiągnąć i co Cię blokuje?
            </div>
          )}

          {chat.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg shadow-sm text-sm leading-relaxed transition-all duration-200 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white self-end markdown-user'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className={`prose prose-sm max-w-none prose-p:mb-1 prose-li:my-0.5 prose-a:underline ${
                  msg.role === 'user'
                    ? 'text-white prose-headings:text-white prose-strong:text-white prose-a:text-white'
                    : 'text-gray-800 prose-a:text-blue-600'
                }`}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ))}

          {loading && (
            <div className="text-sm text-gray-500 animate-pulse">AI myśli...</div>
          )}
        </div>

        {/* INPUT */}
        <div className="border-t bg-white flex p-3 space-x-2 sticky bottom-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Napisz wiadomość..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            Wyślij
          </button>
        </div>
      </div>
    </div>
  )
}
