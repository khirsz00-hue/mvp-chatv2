'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface TaskDialogProps {
  task: { id: string; content: string }
  mode: 'help' | 'none'
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function TaskDialog({ task, mode, onClose }: TaskDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 🔹 Pierwsza wiadomość od AI po otwarciu
  useState(() => {
    if (mode === 'help') {
      const intro: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `🧠 Zajmijmy się zadaniem: **"${task.content}"**.  
Na czym dokładnie ono polega? Co chcesz osiągnąć i co Cię blokuje?`,
      }
      setMessages([intro])
    }
  })

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `Pomóż mi z zadaniem "${task.content}". ${input}`,
          context: `Zadanie: ${task.content}`,
        }),
      })

      const data = await res.json()
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || '🤖 Brak odpowiedzi od AI.',
      }

      setMessages((prev) => [...prev, reply])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Wystąpił błąd podczas komunikacji z AI.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-fadeIn">
        {/* 🔹 Nagłówek */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          <h3 className="text-lg font-semibold">Pomoc z zadaniem</h3>
          <button
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            ✕ Zamknij
          </button>
        </div>

        {/* 🔹 Czat */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[65vh] bg-neutral-50/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`px-3 py-2 rounded-xl leading-relaxed text-sm whitespace-pre-wrap max-w-[90%] ${
                msg.role === 'assistant'
                  ? 'bg-white border border-neutral-200 text-neutral-800 shadow-sm'
                  : 'bg-blue-600 text-white ml-auto'
              }`}
            >
              <ReactMarkdown
                className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5 prose-strong:font-semibold"
                components={{
                  h3: ({ node, ...props }) => (
                    <h3 className="text-base font-semibold mt-2 mb-1" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-blue-700" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="list-disc ml-4" {...props} />
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ))}
          {isLoading && (
            <div className="text-sm text-neutral-500 italic">Piszę...</div>
          )}
        </div>

        {/* 🔹 Input */}
        <div className="border-t border-neutral-200 bg-white p-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Napisz wiadomość..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-60"
          >
            Wyślij
          </button>
        </div>
      </div>
    </div>
  )
}
