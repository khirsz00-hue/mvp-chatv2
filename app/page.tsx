'use client'

import { useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'

export default function Home() {
  useEffect(() => {
    // 🔑 Sprawdź czy w URL jest token z OAuth callback
    const params = new URLSearchParams(window. location.search)
    const todoistToken = params.get('todoist_token')
    
    if (todoistToken) {
      // Zapisz token w localStorage
      localStorage.setItem('todoist_token', todoistToken)
      
      // Wyczyść URL (usuń token z adresu)
      const newUrl = window.location.origin + window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Odśwież stronę żeby załadować nowy layout
      window.location.reload()
    }
  }, [])
  
  return <MainLayout />
}
