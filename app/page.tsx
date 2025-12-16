'use client'

import { useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { useToast } from '@/components/ui/Toast'

export default function Home() {
  const { showToast } = useToast()

  useEffect(() => {
    // Check for OAuth callback indicators in URL
    try {
      const params = new URLSearchParams(window.location.search)
      const todoistConnected = params.get('todoist_connected')
      const error = params.get('error')

      if (todoistConnected === 'true') {
        console.log('✅ Todoist connected successfully')
        showToast('Todoist połączony pomyślnie!', 'success')
        
        // Switch to tasks assistant
        try { localStorage.setItem('active_assistant', 'tasks') } catch {}
        
        // Clean URL
        const url = new URL(window.location.href)
        url.searchParams.delete('todoist_connected')
        window.history.replaceState({}, document.title, url.pathname + url.search)
      } else if (error) {
        console.error('❌ OAuth error:', error)
        
        if (error === 'not_authenticated') {
          showToast('Musisz być zalogowany, aby połączyć Todoist', 'error')
        } else if (error === 'todoist_connection_failed') {
          showToast('Nie udało się połączyć z Todoist', 'error')
        }
        
        // Clean URL
        const url = new URL(window.location.href)
        url.searchParams.delete('error')
        window.history.replaceState({}, document.title, url.pathname + url.search)
      }

      // Legacy support: handle old flow with token in URL (for backward compatibility)
      const todoistToken = params.get('todoist_token')
      if (todoistToken) {
        console.warn('⚠️ Legacy Todoist token flow detected - token should be saved via API callback')
        
        // Switch to tasks assistant
        try { localStorage.setItem('active_assistant', 'tasks') } catch {}
        
        // Clean URL
        const url = new URL(window.location.href)
        url.searchParams.delete('todoist_token')
        window.history.replaceState({}, document.title, url.pathname + url.search)
      }

      // Clean up stale localStorage keys from old assistants
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
        if (removed.length) console.log('[Home] Removed stale localStorage keys:', removed)
      } catch (e) {}
    } catch (e) {
      console.error('[Home] Error processing URL params:', e)
    }
  }, [showToast])
  
  return <MainLayout />
}
