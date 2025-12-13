'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const ERROR_REDIRECT_DELAY = 3000 // 3 seconds
const SUCCESS_REDIRECT_DELAY = 1000 // 1 second

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL
        const params = new URLSearchParams(window.location.search)
        const errorParam = params.get('error')
        const errorDescription = params.get('error_description')
        
        if (errorParam) {
          setError(errorDescription || errorParam)
          setTimeout(() => router.replace('/login'), ERROR_REDIRECT_DELAY)
          return
        }

        // The Supabase client with PKCE flow will automatically handle the callback
        // and exchange the code for a session via detectSessionInUrl
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          setTimeout(() => router.replace('/login'), ERROR_REDIRECT_DELAY)
          return
        }

        if (session) {
          // Successfully authenticated, redirect to home
          router.replace('/')
        } else {
          // No session found, redirect to login
          setTimeout(() => router.replace('/login'), SUCCESS_REDIRECT_DELAY)
        }
      } catch (err: unknown) {
        console.error('Error handling auth callback:', err)
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        setTimeout(() => router.replace('/login'), ERROR_REDIRECT_DELAY)
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Błąd autoryzacji</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Przekierowanie do logowania...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Logowanie...</p>
      </div>
    </div>
  )
}
