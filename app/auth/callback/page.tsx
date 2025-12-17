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
      console.log('🔍 [AuthCallback] Starting callback handling')
      console.log('🔍 [AuthCallback] URL:', window.location.href)
      console.log('🔍 [AuthCallback] Host:', window.location.hostname)
      
      try {
        // Check for error in URL
        const params = new URLSearchParams(window.location.search)
        const errorParam = params.get('error')
        const errorDescription = params.get('error_description')
        
        console.log('🔍 [AuthCallback] Error param:', errorParam)
        console.log('🔍 [AuthCallback] Error description:', errorDescription)
        
        if (errorParam) {
          console.error('❌ [AuthCallback] Error in URL params')
          setError(errorDescription || errorParam)
          setTimeout(() => router.replace('/login'), ERROR_REDIRECT_DELAY)
          return
        }

        // Check for hash-based tokens (magic links and some OAuth flows)
        const hash = window.location.hash
        console.log('🔍 [AuthCallback] Hash:', hash ? 'PRESENT' : 'ABSENT')
        
        // Explicitly exchange code for session if present
        // This is a fallback for cases where:
        // 1. The middleware didn't run (e.g., cached page, service worker)
        // 2. Mobile webview with restricted cookie access
        // 3. Incognito/private browsing with strict cookie policies
        // The Supabase client can handle this idempotently (won't fail if already exchanged)
        const code = params.get('code')
        if (code) {
          console.log('🔍 [AuthCallback] Code param found, exchanging...')
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            console.error('❌ [AuthCallback] Code exchange error:', exchangeError)
            setError(exchangeError.message)
            setTimeout(() => router.replace('/login'), ERROR_REDIRECT_DELAY)
            return
          }
          console.log('✅ [AuthCallback] Code exchange successful')
        }
        
        // The Supabase client with PKCE flow will automatically handle the callback
        // and exchange the code for a session via detectSessionInUrl
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('🔍 [AuthCallback] Session:', session?.user?.id || 'NULL')
        console.log('🔍 [AuthCallback] Session error:', sessionError)

        if (sessionError) {
          console.error('❌ [AuthCallback] Session error:', sessionError)
          setError(sessionError.message)
          setTimeout(() => router.replace('/login'), ERROR_REDIRECT_DELAY)
          return
        }

        if (session) {
          console.log('✅ [AuthCallback] Session found, refreshing and redirecting')
          
          // Refresh session to ensure cookies are properly set
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.warn('⚠️ [AuthCallback] Refresh session warning:', refreshError.message)
          } else {
            console.log('✅ [AuthCallback] Session refreshed successfully')
          }
          
          // Check if cookies were set
          const cookies = document.cookie.split('; ')
          const authCookies = cookies.filter(c => c.startsWith('sb-') && c.includes('auth-token'))
          console.log(`✅ [AuthCallback] Auth cookies found: ${authCookies.length}`)
          
          if (authCookies.length === 0) {
            console.warn('⚠️ [AuthCallback] No auth cookies found after session refresh')
          }
          
          // Wait for cookies to be written
          await new Promise(resolve => setTimeout(resolve, 500))
          
          router.replace('/')
        } else {
          console.log('⚠️ [AuthCallback] No session, redirecting to login')
          setTimeout(() => router.replace('/login'), SUCCESS_REDIRECT_DELAY)
        }
      } catch (err: unknown) {
        console.error('❌ [AuthCallback] Error:', err)
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
