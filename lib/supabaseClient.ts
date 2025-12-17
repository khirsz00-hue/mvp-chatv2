import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

/**
 * Browser client for Supabase with cookie-based session persistence
 * Uses @supabase/ssr for proper cookie handling in production
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get(name: string) {
      if (typeof document === 'undefined') return undefined
      
      const cookies = document.cookie.split('; ')
      const cookie = cookies.find(c => c.startsWith(`${name}=`))
      const value = cookie?.split('=')[1]
      
      // Log cookie access in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client Cookie] Get: ${name} = ${value ? 'PRESENT' : 'ABSENT'}`)
      }
      
      return value
    },
    set(name: string, value: string, options: any) {
      if (typeof document === 'undefined') return
      
      let cookieString = `${name}=${value}`
      
      if (options?.maxAge) {
        cookieString += `; max-age=${options.maxAge}`
      }
      if (options?.path) {
        cookieString += `; path=${options.path}`
      }
      if (options?.domain) {
        cookieString += `; domain=${options.domain}`
      }
      if (options?.sameSite) {
        cookieString += `; samesite=${options.sameSite}`
      }
      if (options?.secure) {
        cookieString += '; secure'
      }
      
      document.cookie = cookieString
      
      // Log cookie set with warning if on non-localhost production host (dev only)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client Cookie] Set: ${name} on ${window.location.hostname}`)
      }
      
      // Verify cookie was set
      const wasSet = document.cookie.includes(`${name}=`)
      if (!wasSet) {
        console.warn(`[Client Cookie] ⚠️ Failed to set cookie: ${name}. Check browser settings and host.`)
      }
    },
    remove(name: string, options: any) {
      if (typeof document === 'undefined') return
      
      // Set with past expiration date
      let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      
      if (options?.path) {
        cookieString += `; path=${options.path}`
      }
      if (options?.domain) {
        cookieString += `; domain=${options.domain}`
      }
      
      document.cookie = cookieString
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client Cookie] Removed: ${name}`)
      }
    }
  }
})
