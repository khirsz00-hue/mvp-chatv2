'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatDockProps {
  onSend?: (msg: string) => void
  mode?: 'global' | 'task'
  task?: any
  token?: string
  tasks?: any[]
}

type Message = { role: 'user' | 'assistant'; content: string }

export default function ChatDock({ onSend, mode = 'global', task, token, tasks }: ChatDockProps) {
  const [chat, setChat] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const storageKey =
    mode === 'task'
      ? `chat_task_${task?.id || task?.content?.slice(0, 20)}`
      : `chat_global`

  // 🔹 Wczytaj historię rozmowy
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChat(JSON.parse(saved))
    }
  }, [storageKey])

  // 💾 Zapisz każdą wiadomość
  useEffect(() => {
    if (typeof window !== 'undefined' && chat.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(chat))
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat])

  // ✉️ Wysyłanie wiadomości
  const handleSend = async () => {
    const message = input.trim()
    if (!message || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: message }
    setChat(prev => [...prev, userMsg])

    // 📤 Tryb globalny → wywołuje funkcję nadrzędną (zmiana filtrów itd.)
    if (mode === 'global' && onSend) {
      await onSend(message)
      setLoading(false)
      return
    }

    try {
      // 💬 Wyślij wiadomość do AI
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context:
            mode === 'task'
              ? `Rozmawiamy o zadaniu: ${task?.content || ''}`
              : `Globalny kontekst Todoist: ${tasks?.length || 0} zadań`,
        }),
      })

      if (!res.ok) throw new Error('Błąd odpowiedzi z API')
      const data = await res.json()

      const aiMsg: Message = {
        role: 'assistant',
        content: data.reply || 'Brak odpowiedzi od AI.',
      }

      setChat(prev => [...prev, aiMsg])

      // 🧠 Dla czatu zadaniowego — generuj syntezę i zapisz do Todoist
      if (mode === 'task' && token && task) {
        await generateSynthesis([...chat, userMsg, aiMsg], task, token)
      }
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setChat(prev => [...prev, { role: 'assistant', content: '⚠️ Wystąpił błąd komunikacji z AI.' }])
    } finally {
      setLoading(false)
    }
  }

  // 🧠 Generowanie syntezy rozmowy i zapis do Todoist
  const generateSynthesis = async (conversation: Message[], task: any, token: string) => {
    try {
      const context = conversation.map(c => `${c.role}: ${c.content}`).join('\n')
      const synthesisPrompt = `
Podsumuj rozmowę o zadaniu "${task.content}" w 2-3 zdaniach.
Uwzględnij ustalenia, plan działania i kluczowe wnioski.
Zacznij od "Wnioski AI:".
      `.trim()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${synthesisPrompt}\n\n${context}` }),
      })

      const data = await res.json()
      const synthesis = data.reply?.trim() || 'Brak syntezy.'

      // 💾 zapis lokalny + event odświeżenia
      localStorage.setItem(`summary_${task.id}`, synthesis)
      window.dispatchEvent(new Event('taskUpdated'))

      // 💬 dodanie komentarza w Todoist
      await fetch('https://api.todoist.com/rest/v2/comments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: task.id,
          content: `[AI] ${synthesis}`,
        }),
      })
    } catch (err) {
      console.error('⚠️ Błąd zapisu syntezy:', err)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Historia rozmowy */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 border rounded-lg">
        {chat.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            {mode === 'task'
              ? '💬 Rozpocznij rozmowę o tym zadaniu...'
              : '🤖 Zadaj pytanie o swoje zadania lub poproś o analizę.'}
          </div>
        ) : (
          chat.map((msg, i) => (
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
                    : 'text-gray-800'
                }`}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ))
        )}
        {loading && <p className="text-sm text-gray-400 animate-pulse">AI myśli...</p>}
      </div>

      {/* Pole do pisania */}
      <div className="flex items-center gap-2 mt-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={
            mode === 'task'
              ? 'Napisz coś o tym zadaniu...'
              : "Zadaj pytanie np. 'daj mi taski na dziś'..."
          }
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          Wyślij
        </button>
      </div>
    </div>
  )
}
