import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceRoleKey && process.env.NODE_ENV !== 'development') {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Server-side operations may fail.')
}

/**
 * Server-side Supabase client with service role key
 * This bypasses Row Level Security (RLS) and should only be used in API routes
 * Never expose this client to the browser
 */
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
