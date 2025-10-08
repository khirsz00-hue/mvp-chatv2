'use client'
import { useState } from 'react'

export default function HomePage() {
  const [message, setMessage] = useState('')
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Witaj w AI Assistants PRO 👋</h1>
      <p className="text-neutral-600">
        Wybierz asystenta w menu (Todoist Helper lub Six Thinking Hats) i rozpocznij rozmowę.
      </p>
      <div className="card space-y-2">
        <input
          className="input"
          placeholder="Zacznij pisać..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => alert(message || 'Napisz coś!')}>
          Wyślij
        </button>
      </div>
    </div>
  )
}
