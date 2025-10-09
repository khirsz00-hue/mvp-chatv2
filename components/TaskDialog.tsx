'use client'

import { useState, useRef, useEffect } from 'react'
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
}

export default function TaskDialog({ task, mode, onClose }: Props) {
  const storageKey = `chat_${task?.id || task?.content?.slice(0, 30)}`
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [todoistToken, setTodoistToken] = useState<string>('')

  // 🔹 Wczytaj historię i token tylko raz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChat(JSON.parse(saved))
      const token = localStorage.getItem('todoist_token') || ''
      setTodoistToken(token)
    }
  }, [storageKey])

  // 💾 Zapisz rozmowę przy każdej zmianie
  useEffect(() => {
    if (typeof window !== 'undefined' && chat.length > 0) {
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

    const newMessage: ChatMessage = { role: 'user', content: userMessage }
    const updatedChat = [...chat, newMessage]
    setChat(updatedChat)
    setInput('')
    setLoading(true)

    try {
      // 🔹 Wyślij wiadomość do API
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
      const reply =
        typeof data.reply === 'string' ? data.reply.trim() : '⚠️ Brak odpowiedzi od modelu.'

      const newChat: ChatMessage[] = [
        ...updatedChat,
        { role: 'assistant', content: reply },
      ]
      setChat(newChat)

      // 🔹 Generuj syntezę po odpowiedzi
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

  // 🧠 SYNTEZA – generuje skrót rozmowy i wysyła do Todoist
  const generateSynthesis = async (fullChat: ChatMessage[]) => {
    try {
      const contextText = fullChat.map(m => `${m.role}: ${m.content}`).join('\n')
      const synthesisPrompt = `
Podsumuj rozmowę o zadaniu "${task.content}" w 2-3 zdaniach. 
Uwzględnij najważniejsze ustalenia lub wnioski. 
Napisz po polsku, zaczynając od "Wnioski AI:".
      `.trim()

      const synthesisRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: synthesisPrompt + '\n\n' + contextText }),
      })

      if (!synthesisRes.ok) throw new Error('Błąd generowania syntezy')
      const synthesisData = await synthesisRes.json()
      const synthesis = synthesisData.reply?.trim() || 'Brak syntezy.'

      // 💾 Zapisz lokalnie
      if (typeof window !== 'undefined') {
        localStorage.setItem(`summary_${task.id}`, synthesis)
        window.dispatchEvent(new Event('taskUpdated'))
      }

      // 💬 Wyślij komentarz do Todoist
      if (todoistToken) {
        await fetch('https://api.todoist.com/rest/v2/comments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${todoistToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task_id: task.id,
            content: `[AI] ${synthesis}`,
          }),
        })
      }
    } catch (err) {
      console.error('⚠️ Błąd zapisu syntezy:', err)
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

          {loading && <div className="text-sm text-gray-500 animate-pulse">AI myśli...</div>}
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
