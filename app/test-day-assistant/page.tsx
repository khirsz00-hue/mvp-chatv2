/**
 * Test Day Assistant Page
 * Redirects to main page with test-day-assistant view active
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TestDayAssistantPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to main page and set active view to test-day-assistant
    try {
      localStorage.setItem('active_assistant', 'test-day-assistant')
    } catch {}
    router.push('/')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Przekierowanie...</p>
      </div>
    </div>
  )
}
