'use client'
import { useEffect, useState } from 'react'

export default function SidebarHistory() {
  const [history, setHistory] = useState<{ task: string; last: string; date: string }[]>([])

  useEffect(() => {
    const data = Object.keys(localStorage)
      .filter(k => k.startsWith('chat_'))
      .map(k => {
        const chat = JSON.parse(localStorage.getItem(k) || '[]')
        const last = chat[chat.length - 1]?.content || ''
        const date = new Date().toLocaleDateString()
        return { task: k.replace('chat_', ''), last, date }
      })
    setHistory(data.reverse().slice(0, 5))
  }, [])

  return (
    <div className="mt-4 border-t pt-2">
      <h3 className="font-semibold text-gray-700 mb-2">💬 Historia rozmów</h3>
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">Brak rozmów.</p>
      ) : (
        <ul className="text-sm space-y-2">
          {history.map((h, i) => (
            <li key={i} className="border rounded-lg p-2 bg-gray-50 hover:bg-gray-100 transition">
              <div className="font-medium text-gray-800 truncate">{h.task}</div>
              <div className="text-xs text-gray-500">{h.date}</div>
              <div className="text-xs text-gray-600 italic line-clamp-2">{h.last}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
