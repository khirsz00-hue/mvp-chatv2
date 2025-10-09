'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  task: any
  mode: 'none' | 'help'
  onClose: () => void
}

export default function TaskDialog({ task, mode, onClose }: Props) {
  const [step, setStep] = useState<'choose' | 'chat'>('choose')
  const [chat, setChat] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return
    const newMessage = { role: 'user' as const, content: input }
    setChat(prev => [...prev, newMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...chat,
            newMessage,
            {
              role: 'system',
              content: `Pomóż zrealizować zadanie: "${task.content}". 
              Zadawaj doprecyzowujące pytania zanim udzielisz odpowiedzi. 
              Udzielaj praktycznych, uporządkowanych rad w formie listy.`,
            },
          ],
        }),
      })

      if (!res.ok) throw new Error('Błąd odpowiedzi z API')
      const data = await res.json()
      setChat(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setChat(prev => [...prev, { role: 'assistant', content: '⚠️ Wystąpił błąd podczas komunikacji z AI.' }])
    } finally {
      setLoading(false)
    }
  }

  if (mode !== 'help') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-200">
        <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Pomoc z zadaniem</h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            ✕ Zamknij
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
          <div className="bg-white p-3 rounded-lg shadow-sm border text-sm text-gray-800 leading-relaxed">
            🧠 Zajmijmy się zadaniem: <b>"{task.content}"</b>.<br />
            Na czym dokładnie ono polega? Co chcesz osiągnąć i co Cię blokuje?
          </div>

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
                className="prose prose-sm max-w-none prose-headings:mb-2 prose-p:mb-2 prose-ul:list-disc prose-ul:ml-5 prose-li:my-0.5 prose-a:text-blue-600 prose-a:underline"
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ))}

          {loading && (
            <div className="text-sm text-gray-500 animate-pulse">AI myśli...</div>
          )}
        </div>

        <div className="border-t bg-white flex p-3 space-x-2">
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
