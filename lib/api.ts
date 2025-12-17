/**
 * Centralized API helper for client-side requests
 * 
 * Ensures credentials (cookies) are sent with every request to support
 * Supabase authentication in API routes
 */

// Simple in-memory cache for GET requests - stores response body as JSON
interface CacheEntry {
  data: any
  status: number
  headers: Record<string, string>
  timestamp: number
}

const getCache = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, Promise<Response>>()
const CACHE_TTL = 5000 // 5 seconds cache TTL

/**
 * API GET request with credentials and request deduplication
 * @param path - API path (e.g., '/api/day-assistant/queue')
 * @param init - Optional fetch init options
 * @param options - Additional options for caching
 */
export async function apiGet(
  path: string, 
  init: RequestInit = {},
  options: { cache?: boolean; ttl?: number } = {}
) {
  const { cache = false, ttl = CACHE_TTL } = options
  const cacheKey = `${path}${JSON.stringify(init)}`
  
  // Check cache if enabled
  if (cache) {
    const cached = getCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`[API Cache] Hit for ${path}`)
      // Create a new Response from cached data
      return new Response(JSON.stringify(cached.data), {
        status: cached.status,
        headers: cached.headers
      })
    }
  }
  
  // Check if request is already in flight (deduplication)
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    console.log(`[API Dedup] Reusing in-flight request for ${path}`)
    return pending
  }
  
  // Make the request
  const requestPromise = fetch(path, {
    credentials: 'include',
    ...init,
  }).then(async res => {
    // Remove from pending
    pendingRequests.delete(cacheKey)
    
    // Cache if enabled and successful
    if (cache && res.ok) {
      // Clone and consume the response to cache it
      const cloned = res.clone()
      const data = await cloned.json()
      const headers: Record<string, string> = {}
      cloned.headers.forEach((value, key) => {
        headers[key] = value
      })
      
      getCache.set(cacheKey, {
        data,
        status: res.status,
        headers,
        timestamp: Date.now()
      })
      
      // Clean up old cache entries
      setTimeout(() => {
        getCache.delete(cacheKey)
      }, ttl)
    }
    
    return res
  }).catch(err => {
    pendingRequests.delete(cacheKey)
    throw err
  })
  
  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

/**
 * API POST request with credentials
 * @param path - API path
 * @param body - Request body (will be JSON stringified)
 * @param init - Optional fetch init options
 */
export async function apiPost(path: string, body?: any, init: RequestInit = {}) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  })
  return res
}

/**
 * API PUT request with credentials
 * @param path - API path
 * @param body - Request body (will be JSON stringified)
 * @param init - Optional fetch init options
 */
export async function apiPut(path: string, body?: any, init: RequestInit = {}) {
  const res = await fetch(path, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  })
  return res
}

/**
 * API DELETE request with credentials
 * @param path - API path
 * @param init - Optional fetch init options
 */
export async function apiDelete(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    method: 'DELETE',
    credentials: 'include',
    ...init,
  })
  return res
}

/**
 * Invalidate cache entries matching a pattern
 * @param pattern - String or RegExp to match against cache keys
 */
export function invalidateCache(pattern: string | RegExp) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
  const keysToDelete: string[] = []
  
  for (const key of getCache.keys()) {
    if (regex.test(key)) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => getCache.delete(key))
  console.log(`[API Cache] Invalidated ${keysToDelete.length} entries matching ${pattern}`)
}
