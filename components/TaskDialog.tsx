'use client'

import { useState } from 'react'

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

  // 🔹 Początkowe pytanie od AI
  useState(() => {
    if (mode === 'help') {
      const intro: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `🧠 Zajmijmy się zadaniem: "${task.content}".  
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        {/* 🔹 Nagłówek */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-200">
          <h3 className="text-lg font-semibold">Pomoc z zadaniem</h3>
          <button
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            ✕ Zamknij
          </button>
        </div>

        {/* 🔹 Czat */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded-lg max-w-[85%] ${
                msg.role === 'assistant'
                  ? 'bg-neutral-100 text-neutral-900 self-start'
                  : 'bg-blue-500 text-white self-end ml-auto'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="text-sm text-neutral-500 italic">Piszę...</div>
          )}
        </div>

        {/* 🔹 Input */}
        <div className="border-t border-neutral-200 p-3 flex items-center gap-2">
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
