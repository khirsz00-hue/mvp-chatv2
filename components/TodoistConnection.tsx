'use client'

import { useEffect, useState } from 'react'

export default function TodoistConnection() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // sprawdź token w URL po przekierowaniu z Todoist
    const urlParams = new URLSearchParams(window.location.search)
    const accessToken = urlParams.get('todoist_token')
    if (accessToken) {
      localStorage.setItem('todoist_token', accessToken)
      setToken(accessToken)
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      const saved = localStorage.getItem('todoist_token')
      if (saved) setToken(saved)
    }
  }, [])

  const handleDisconnect = () => {
    localStorage.removeItem('todoist_token')
    setToken(null)
  }

  if (!token) {
    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800 mb-2">
          🔗 Połącz konto Todoist, aby zarządzać swoimi zadaniami.
        </p>
        <a
          href="/api/todoist/auth"
          className="btn btn-primary text-sm"
        >
          Połącz z Todoist
        </a>
      </div>
    )
  }

  return (
    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
      <span className="text-sm text-green-700">✅ Połączono z Todoist</span>
      <button onClick={handleDisconnect} className="btn text-sm">
        Odłącz
      </button>
    </div>
  )
}
