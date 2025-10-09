'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  onClose: () => void
}

export default function GlobalDialog({ onClose }: Props) {
  const storageKey = 'chat_global'
  const summaryKey = 'summary_global'

  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 🧩 Wczytaj poprzednią rozmowę i syntezę
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(storageKey)
    if (saved) setChat(JSON.parse(saved))
    const savedSummary = localStorage.getItem(summaryKey)
    if (savedSummary) setSummary(savedSummary)
  }, [])

  // 💾 Zapisz rozmowę po każdej zmianie
  useEffect(() => {
    if (chat.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(chat))
    }
  }, [chat])

  // 🔽 Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat, loading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const updated = [...chat, userMsg]
    setChat(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!res.ok) throw new Error('Błąd odpowiedzi z API')
      const data = await res.json()
      const reply = (data.reply?.trim() || '⚠️ Brak odpowiedzi od modelu.') as string

      const newChat: ChatMessage[] = [
        ...updated,
        { role: 'assistant' as const, content: reply },
      ]

      setChat(newChat)
      localStorage.setItem(storageKey, JSON.stringify(newChat))
      await generateSynthesis(newChat)
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

  // 🧠 SYNTEZA – generuje skrót rozmowy (2–3 zdania)
  const generateSynthesis = async (fullChat: ChatMessage[]) => {
    try {
      const context = fullChat.map(m => `${m.role}: ${m.content}`).join('\n')
      const prompt = `
Podsumuj rozmowę globalną w 2–3 zdaniach.
Uwzględnij kluczowe decyzje, plany lub wnioski użytkownika.
Napisz po polsku, zaczynając od "Wnioski AI:".
      `.trim()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt + '\n\n' + context }),
      })

      if (!res.ok) throw new Error('Błąd generowania syntezy')
      const data = await res.json()
      const synthesis = (data.reply?.trim() || 'Brak syntezy.') as string

      localStorage.setItem(summaryKey, synthesis)
      setSummary(synthesis)
      window.dispatchEvent(new Event('globalChatUpdated'))
    } catch (err) {
      console.error('⚠️ Błąd generowania syntezy globalnej:', err)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col border border-gray-200 overflow-hidden animate-fadeIn max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Asystent globalny 🤖</h2>
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
              👋 Cześć! Jestem Twoim asystentem produktywności.<br />
              Możesz zapytać np.:
              <ul className="list-disc ml-5 mt-2 text-gray-600">
                <li>„Pomóż mi zaplanować dzień”</li>
                <li>„Zaproponuj kolejność zadań”</li>
                <li>„Jak się skupić przy pracy?”</li>
              </ul>
            </div>
          )}

          {chat.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg shadow-sm text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white self-end'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className={`prose prose-sm max-w-none ${
                  msg.role === 'user'
                    ? 'text-white prose-headings:text-white prose-strong:text-white'
                    : 'text-gray-800 prose-a:text-blue-600'
                }`}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ))}

          {loading && <div className="text-sm text-gray-500 animate-pulse">AI myśli...</div>}

          {summary && (
            <div className="mt-3 text-xs text-gray-500 italic border-t pt-2">
              {summary}
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="border-t bg-white flex p-3 space-x-2 sticky bottom-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Zadaj pytanie np. „Pomóż mi zaplanować dzień...”"
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
