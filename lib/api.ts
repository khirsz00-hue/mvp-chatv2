/**
 * Centralized API helper for client-side requests
 * 
 * Ensures credentials (cookies) are sent with every request to support
 * Supabase authentication in API routes
 */

/**
 * API GET request with credentials
 * @param path - API path (e.g., '/api/day-assistant/queue')
 * @param init - Optional fetch init options
 */
export async function apiGet(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
  })
  return res
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
