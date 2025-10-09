'use client'
import { useState } from 'react'

type Props = { onSend: (msg: string) => void }

export default function ChatDock({ onSend }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    await onSend(input)
    setInput('')
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="Zadaj pytanie np. 'daj mi taski na dziś'..."
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
  )
}
