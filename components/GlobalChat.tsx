'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface GlobalChatProps {
  token: string
  tasks: any[]
  onOpenTaskChat: (t: any) => void
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function GlobalChat({ token, tasks, onOpenTaskChat }: GlobalChatProps) {
  const storageKey = 'chat_global'
  const summaryKey = 'summary_global'

  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 🧩 Wczytaj historię rozmowy
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(storageKey)
    if (saved) setChat(JSON.parse(saved))
    const savedSummary = localStorage.getItem(summaryKey)
    if (savedSummary) setSummary(savedSummary)
  }, [])

  // 💾 Zapisuj rozmowę
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

  // 🧠 SYNTEZA – zapis skrótu rozmowy
  const generateSynthesis = async (fullChat: ChatMessage[]) => {
    try {
      const contextText = fullChat.map(m => `${m.role}: ${m.content}`).join('\n')
      const synthesisPrompt = `
Podsumuj globalną rozmowę użytkownika w 2–3 zdaniach.
Uwzględnij najważniejsze ustalenia, decyzje lub plany.
Napisz po polsku, zaczynając od "Wnioski AI:".
      `.trim()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: synthesisPrompt + '\n\n' + contextText }),
      })

      if (!res.ok) throw new Error('Błąd generowania syntezy')
      const data = await res.json()
      const synthesis = (data.reply?.trim() || 'Brak syntezy.') as string

      localStorage.setItem(summaryKey, synthesis)
      setSummary(synthesis)
      window.dispatchEvent(new Event('globalChatUpdated'))
    } catch (err) {
      console.error('⚠️ Błąd syntezy globalnej:', err)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* HEADER */}
      <div className="border-b bg-gray-50 p-3 flex justify-between items-center">
        <h2 className="font-semibold text-gray-700 text-sm">🤖 Asystent Todoist AI</h2>
        <span className="text-xs text-gray-400">Tryb ogólny</span>
      </div>

      {/* CZAT */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 text-sm text-gray-700 bg-gray-50"
      >
        {chat.length === 0 && (
          <div className="bg-white p-3 rounded-lg shadow-sm border text-sm text-gray-800">
            👋 Cześć! Jestem Twoim asystentem produktywności.<br />
            Możesz zapytać np.:
            <ul className="list-disc ml-5 mt-2 text-gray-600">
              <li>„Pokaż zadania na dziś”</li>
              <li>„Zaproponuj kolejność zadań”</li>
              <li>„Pomóż mi zaplanować dzień”</li>
              <li>„Które zadania są przeterminowane?”</li>
            </ul>
          </div>
        )}

        {chat.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg shadow-sm leading-relaxed transition-all ${
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
      <div className="border-t bg-white flex p-3 space-x-2">
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
  )
}
