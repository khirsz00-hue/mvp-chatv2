/**
 * Auth State Manager
 * 
 * Ensures cookies are properly synchronized with Supabase auth state
 * Provides diagnostics for cookie-based authentication
 */

import { supabase } from './supabaseClient'

let isListenerInitialized = false

/**
 * Initialize auth state change listener
 * Call this once in your root layout or app component
 */
export function initAuthStateListener() {
  if (isListenerInitialized || typeof window === 'undefined') {
    return
  }
  
  isListenerInitialized = true
  
  console.log('[Auth State Manager] Initializing auth state listener')
  
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Auth State Manager] Event: ${event}`)
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session) {
        console.log(`[Auth State Manager] ✓ Session active for user: ${session.user.id.substring(0, 8)}...`)
        
        // Check if cookies are present
        checkAuthCookies()
      } else {
        console.warn('[Auth State Manager] ⚠️ Session event but no session object')
      }
    } else if (event === 'SIGNED_OUT') {
      console.log('[Auth State Manager] User signed out - cookies should be cleared')
      checkAuthCookies()
    }
  })
  
  // Initial check
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error('[Auth State Manager] ✗ Error getting initial session:', error.message)
    } else if (session) {
      console.log('[Auth State Manager] ✓ Initial session found')
      checkAuthCookies()
    } else {
      console.log('[Auth State Manager] No initial session')
    }
  })
}

/**
 * Check if Supabase auth cookies are present
 * Logs diagnostic information
 */
function checkAuthCookies() {
  if (typeof document === 'undefined') return
  
  const cookies = document.cookie.split('; ')
  const authCookies = cookies.filter(c => c.startsWith('sb-') && c.includes('auth-token'))
  
  if (authCookies.length > 0) {
    console.log(`[Auth State Manager] ✓ Found ${authCookies.length} Supabase auth cookie(s)`)
    
    if (process.env.NODE_ENV === 'development') {
      authCookies.forEach(cookie => {
        const name = cookie.split('=')[0]
        console.log(`[Auth State Manager]   - ${name}`)
      })
    }
  } else {
    console.warn(`[Auth State Manager] ⚠️ No Supabase auth cookies found`)
    console.warn(`[Auth State Manager] Host: ${window.location.hostname}`)
    console.warn(`[Auth State Manager] This may cause 401 errors on API requests`)
    
    // Show all cookies for debugging
    if (process.env.NODE_ENV === 'development' && cookies.length > 0) {
      console.log('[Auth State Manager] All cookies:', cookies.map(c => c.split('=')[0]).join(', '))
    } else if (cookies.length === 0) {
      console.warn('[Auth State Manager] No cookies at all - check browser settings')
    }
  }
}

/**
 * Get current auth status with diagnostics
 * Useful for debugging authentication issues
 */
export async function getAuthDiagnostics() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  const cookies = typeof document !== 'undefined' 
    ? document.cookie.split('; ').filter(c => c.startsWith('sb-'))
    : []
  
  return {
    hasSession: !!session,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    cookieCount: cookies.length,
    cookieNames: cookies.map(c => c.split('=')[0]),
    error: error?.message,
    host: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
  }
}
