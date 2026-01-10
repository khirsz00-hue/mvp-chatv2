/**
 * Supabase Authentication Utilities for API Routes
 * 
 * Provides helper functions to create authenticated Supabase clients
 * for Next.js App Router API routes with proper RLS context
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates an authenticated Supabase client for API routes
 * Uses cookies to maintain user session and respects RLS policies
 * 
 * @param request - Optional Request object to check Authorization header (for server-to-server calls)
 * @returns Promise<SupabaseClient> - Authenticated Supabase client
 */
export async function createAuthenticatedSupabaseClient(
  request?: Request
): Promise<SupabaseClient> {
  // 1. Try Authorization header first (server-to-server calls)
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      
      // Create client with explicit access token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      console.log('[Auth] ✓ Using Authorization header for authentication')
      return supabase
    }
  }
  
  // 2. Fallback to cookies (browser-to-server calls)
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Defensive logging: confirm cookies present without leaking values
  // Supabase uses 'sb-<project>-auth-token' pattern for auth cookies
  const authCookies = allCookies.filter(c => c.name.startsWith('sb-') && c.name.includes('auth-token'))
  
  console.log(`[Auth] Total cookies received: ${allCookies.length}`)
  
  // Only log cookie names in development to avoid exposing info in production
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] Cookie names: ${allCookies.map(c => c.name).join(', ')}`)
  }
  
  if (authCookies.length > 0) {
    console.log(`[Auth] ✓ Found ${authCookies.length} Supabase auth cookie(s) for session`)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth] Auth cookie names: ${authCookies.map(c => c.name).join(', ')}`)
    }
  } else {
    console.warn('[Auth] ✗ No Supabase auth cookies found - user likely not authenticated')
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Auth] All cookie names present:', allCookies.map(c => c.name).join(', ') || 'NONE')
    }
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
    console.error('[Auth] ✗ Authentication error:', error.message || 'Unknown error')
    console.error('[Auth] Error name:', error.name)
    return null
  }
  
  if (!user) {
    console.warn('[Auth] ✗ No user found in session')
    return null
  }
  
  // Log successful auth with user ID prefix
  console.log(`[Auth] ✓ User authenticated: ${user.id.substring(0, 8)}...`)
  
  // Only log email in development to avoid exposing PII in production logs
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] User email: ${user.email}`)
  }
  
  return user
}
