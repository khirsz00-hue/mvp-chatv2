/**
 * Supabase Authentication Utilities for API Routes
 * 
 * Provides helper functions to create authenticated Supabase clients
 * for Next.js App Router API routes with proper RLS context
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates an authenticated Supabase client for API routes
 * Uses cookies to maintain user session and respects RLS policies
 * 
 * @returns Promise<SupabaseClient> - Authenticated Supabase client
 */
export async function createAuthenticatedSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Defensive logging: confirm cookies present without leaking values
  // Supabase uses 'sb-<project>-auth-token' pattern for auth cookies
  const authCookies = allCookies.filter(c => c.name.startsWith('sb-') && c.name.includes('auth-token'))
  if (authCookies.length > 0) {
    console.log(`[Auth] Found ${authCookies.length} Supabase auth cookie(s) for session`)
  } else {
    console.warn('[Auth] No Supabase auth cookies found - user likely not authenticated')
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return allCookies
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

/**
 * Gets the authenticated user from the Supabase client
 * Returns null if user is not authenticated
 * 
 * @param supabase - Supabase client instance
 * @returns Promise with user object or null
 */
export async function getAuthenticatedUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    // Log error type but not sensitive details
    console.error('[Auth] Authentication error:', error.message || 'Unknown error')
    return null
  }
  
  if (!user) {
    console.warn('[Auth] No user found in session')
    return null
  }
  
  // Log successful auth in development only
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] User authenticated: ${user.id.substring(0, 8)}...`)
  }
  
  return user
}
