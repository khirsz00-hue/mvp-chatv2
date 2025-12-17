import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Cache for the Supabase server client instance
 */
let cachedClient: SupabaseClient | null = null

/**
 * Creates and validates the Supabase server client
 * This function is called lazily when the client is first accessed
 */
function createSupabaseServer(): SupabaseClient {
  // Return cached client if it exists
  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE is not set. This is required for server-side operations.')
  }

  // Create and cache the client
  cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return cachedClient
}

/**
 * Server-side Supabase client with service role key
 * This bypasses Row Level Security (RLS) and should only be used in API routes
 * Never expose this client to the browser
 * 
 * Uses lazy initialization via Proxy pattern - the client is only created
 * when first accessed, not at module load time. This prevents build-time
 * errors when environment variables are not available during the build process.
 */
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get: (target, prop, receiver) => {
    const client = createSupabaseServer()
    return Reflect.get(client, prop, client)
  }
})
