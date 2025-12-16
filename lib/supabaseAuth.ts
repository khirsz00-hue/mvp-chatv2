/**
 * Supabase Authentication Utilities for API Routes
 * 
 * Provides helper functions to create authenticated Supabase clients
 * for Next.js App Router API routes with proper RLS context
 */

import { createServerClient } from '@supabase/auth-helpers-nextjs'
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
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
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
  
  if (error || !user) {
    console.error('[Auth] Authentication error:', error)
    return null
  }
  
  return user
}
