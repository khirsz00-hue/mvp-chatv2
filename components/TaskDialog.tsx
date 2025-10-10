'use client'

import { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  task: any
  mode: 'none' | 'help'
  onClose: () => void
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function TaskDialog({ task, mode, onClose }: Props) {
  const chatKey = `chat_task_${task?.id}`
  const summaryKey = `summary_${task?.id}`
  const titleKey = `task_title_${task?.id}`

  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [todoistToken, setTodoistToken] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const recentMessages = useRef<Set<string>>(new Set())

  // 🧭 Zablokuj scroll strony, gdy modal otwarty
  useEffect(() => {
    if (mode === 'help') document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mode])

  // 🧩 Wczytaj historię rozmowy + token
  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(chatKey)
    if (saved) {
      const parsedRaw = JSON.parse(saved)
      let parsed: ChatMessage[] = []

      parsed = parsedRaw.map((m: any) => ({
        ...m,
        timestamp: m.timestamp ? Number(m.timestamp) : Date.now(),
      }))

      setChat(parsed.sort((a, b) => b.timestamp - a.timestamp))
    }

    const token = localStorage.getItem('todoist_token') || ''
    setTodoistToken(token)
    localStorage.setItem(titleKey, task.content)
  }, [chatKey, titleKey, task.content])

  // 💾 Zapisuj rozmowę (bez nadpisywania timestampów)
  useEffect(() => {
    if (typeof window !== 'undefined' && chat.length > 0) {
      localStorage.setItem(chatKey, JSON.stringify(chat))
    }
  }, [chat, chatKey])

  // 🔽 Auto-scroll na górę przy nowych wiadomościach
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [chat, loading])

  // 🔁 SSE – aktualizacja na żywo
  useEffect(() => {
    const es = new EventSource('/api/chat/stream')

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'chat_message' && data.taskId === task.id) {
          const id = `${data.role}:${data.message}`
          if (recentMessages.current.has(id)) return
          recentMessages.current.add(id)

          setChat((prev) => [
            { role: data.role, content: data.message, timestamp: Date.now() },
            ...prev,
          ])
        }
      } catch (err) {
        console.error('❌ Błąd SSE:', err)
      }
    }

    es.onerror = () => {
      es.close()
      setTimeout(() => new EventSource('/api/chat/stream'), 5000)
    }

    return () => es.close()
  }, [task.id])

  // ✉️ Wysyłanie wiadomości — poprawione
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const updated = [userMsg, ...chat]
    setChat(updated)
    setInput('')
    setLoading(true)
    recentMessages.current.add(`user:${text}`)

    try {
      // 👇 Kluczowa zmiana: nowy endpoint i kontekst zadania
      const res = await fetch('/api/chat/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          task: task.content, // przekazujemy treść klikniętego zadania
        }),
      })

      if (!res.ok) throw new Error('Błąd odpowiedzi z API')
      const data = await res.json()
      const reply = data.reply?.trim() || '⚠️ Brak odpowiedzi od modelu.'

      await Promise.all([
        fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, message: text, role: 'user' }),
        }),
        fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, message: reply, role: 'assistant' }),
        }),
      ])

      const aiMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
      const newChat = [aiMsg, ...updated]
      setChat(newChat)
      localStorage.setItem(chatKey, JSON.stringify(newChat))
      await generateSynthesis(newChat)
    } catch (err) {
      console.error('❌ Błąd komunikacji z AI:', err)
      setChat((prev) => [
        { role: 'assistant', content: '⚠️ Błąd podczas komunikacji z AI.', timestamp: Date.now() },
        ...prev,
      ])
    } finally {
      setLoading(false)
    }
  }

  // 🧠 Synteza (podsumowanie rozmowy)
  const generateSynthesis = async (fullChat: ChatMessage[]) => {
    try {
      const contextText = fullChat
        .slice()
        .reverse()
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')

      const synthesisPrompt = `
Podsumuj rozmowę o zadaniu "${task.content}" w 2–3 zdaniach.
Uwzględnij najważniejsze ustalenia, decyzje lub plan działania.
Napisz po polsku, zaczynając od "Wnioski AI:".
      `.trim()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: synthesisPrompt + '\n\n' + contextText }),
      })

      if (!res.ok) throw new Error('Błąd generowania syntezy')
      const data = await res.json()
      const synthesis = data.reply?.trim() || 'Brak syntezy.'

      localStorage.setItem(summaryKey, synthesis)
      window.dispatchEvent(new Event('taskUpdated'))

      if (todoistToken) {
        await fetch('https://api.todoist.com/rest/v2/comments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${todoistToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ task_id: task.id, content: `[AI] ${synthesis}` }),
        })
      }
    } catch (err) {
      console.error('⚠️ Błąd zapisu syntezy:', err)
    }
  }

  if (mode !== 'help') return null

  // 🪄 Modal
  const modal = (
    <AnimatePresence>
      <motion.div
        key="dialog"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3"
        onClick={onClose}
      >
        <div
          className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="sticky top-0 flex justify-between items-center px-5 py-3 border-b bg-gray-50 z-10">
            <h2 className="text-lg font-semibold text-gray-800 truncate pr-4">
              {task.content || 'Rozmowa'}
            </h2>
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              ✕ Zamknij
            </button>
          </div>

          {/* CZAT */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto flex flex-col-reverse px-5 py-4 space-y-4 bg-gray-50 scroll-smooth"
          >
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
                  className={`prose prose-sm max-w-none ${
                    msg.role === 'user'
                      ? 'text-white prose-headings:text-white prose-strong:text-white prose-a:text-white'
                      : 'text-gray-800 prose-a:text-blue-600'
                  }`}
                >
                  {msg.content}
                </ReactMarkdown>
                <div className="text-[10px] mt-1 opacity-70 text-right">
                  {new Date(msg.timestamp).toLocaleString([], {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}

            {chat.length === 0 && (
              <div className="bg-white p-3 rounded-lg shadow-sm border text-sm text-gray-800 leading-relaxed">
                🧠 Zajmijmy się zadaniem: <b>"{task.content}"</b>.<br />
                Co chcesz osiągnąć i co Cię blokuje?
              </div>
            )}

            {loading && <div className="text-sm text-gray-500 animate-pulse">AI myśli...</div>}
          </div>

          {/* INPUT */}
          <div className="sticky bottom-0 border-t bg-white flex p-3 space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
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
      </motion.div>
    </AnimatePresence>
  )

  return typeof window !== 'undefined'
    ? ReactDOM.createPortal(modal, document.body)
    : null
}
