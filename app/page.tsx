'use client'

import { useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'

export default function Home() {
  useEffect(() => {
    // 🔑 Sprawdź czy w URL jest token lub kod z OAuth callback (różne warianty)
    try {
      const params = new URLSearchParams(window.location.search)
      const todoistToken = params.get('todoist_token')
      const code = params.get('code')
      const inCallbackPath = window.location.pathname.includes('/api/todoist/callback')
      const inHash = window.location.hash.includes('todoist_token') || window.location.hash.includes('code')

      const hasOAuth = Boolean(todoistToken || code || inCallbackPath || inHash)

      if (hasOAuth) {
        // Jeśli mamy token, zapisz go
        if (todoistToken) {
          try { localStorage.setItem('todoist_token', todoistToken) } catch {}
        }

        // Wymuś widok z zadaniami
        try { localStorage.setItem('active_assistant', 'tasks') } catch {}

        // Usuń stare klucze localStorage powiązane z usuniętymi asystentami (np. 6hats)
        try {
          const stalePatterns = [ /6hats/i, /six[_-]?hats/i, /6[-]?hats/i, /chat_6hats/i, /chat_sessions_6hats/i, /prompt_6hats/i ]
          const removed: string[] = []
          Object.keys(localStorage).forEach((k) => {
            if (k === 'todoist_token' || k === 'active_assistant') return
            if (stalePatterns.some(p => p.test(k))) {
              try { localStorage.removeItem(k) } catch {}
              removed.push(k)
            }
          })
          if (removed.length) console.log('Removed stale localStorage keys:', removed)
        } catch (e) {}

        // Usuń wrażliwe parametry z URL (bez przeładowania strony)
        try {
          const url = new URL(window.location.href)
          url.searchParams.delete('todoist_token')
          url.searchParams.delete('code')
          // usuń też ewentualny token z hash
          const cleanHash = (url.hash || '').replace(/todoist_token=[^&]*&?/, '').replace(/code=[^&]*&?/, '').replace(/&$/, '')
          const newPath = url.pathname + url.search + (cleanHash ? `#${cleanHash.replace(/^#/, '')}` : '')
          window.history.replaceState({}, document.title, newPath)
        } catch {}

        // Odśwież aby załadować UI z nową preferencją
        window.location.reload()
      }
    } catch (e) {
      // ignore
    }
  }, [])
  
  return <MainLayout />
}
