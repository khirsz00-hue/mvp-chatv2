/**
 * Global Todoist Sync Coordinator
 * Prevents redundant sync operations when multiple components are active
 * Handles token refresh on 401 errors
 */

import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

let syncPromise: Promise<{ response: Response; data: any }> | null = null
let lastSyncTime = 0
const SYNC_DEBOUNCE_MS = 30000 // 30 seconds - sensible interval for Todoist API to avoid rate limiting

/**
 * Safely parse JSON response, returning empty object on error
 */
async function safeParseJson(response: Response): Promise<any> {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

/**
 * Show appropriate error toast based on error response
 */
function showErrorToast(errorData: any, statusCode: number) {
  if (errorData.error === 'Todoist not connected') {
    toast.error('Todoist nie jest połączony. Połącz w ustawieniach.')
  } else if (errorData.error === 'Todoist token expired') {
    toast.error('Token Todoist wygasł. Połącz ponownie w ustawieniach.')
  } else if (statusCode === 401) {
    toast.error('Sesja wygasła. Zaloguj się ponownie.')
  } else if (statusCode >= 500) {
    toast.error('Błąd serwera podczas synchronizacji')
  } else {
    toast.error('Błąd synchronizacji z Todoist')
  }
}

/**
 * Coordinated sync that prevents concurrent/redundant syncs
 * Automatically handles token refresh on 401 errors
 * @param authToken - Bearer token for authentication (optional, will get fresh token if not provided)
 * @returns Promise that resolves with parsed response data
 */
export async function syncTodoist(authToken?: string): Promise<{ response: Response; data: any }> {
  const now = Date.now()
  
  // If there's an ongoing sync, reuse it
  if (syncPromise) {
    console.log('🔄 [SyncCoordinator] Reusing ongoing sync')
    return syncPromise
  }
  
  // If last sync was recent, skip
  const timeSinceLastSync = now - lastSyncTime
  if (timeSinceLastSync < SYNC_DEBOUNCE_MS) {
    const secondsAgo = Math.floor(timeSinceLastSync / 1000)
    console.log(`⏭️ [SyncCoordinator] Skipping - last sync was ${secondsAgo}s ago (debounce: ${SYNC_DEBOUNCE_MS / 1000}s)`)
    // Return a mock successful response indicating sync was skipped
    const mockData = { 
      message: 'Sync skipped - too soon',
      skipped: true,
      seconds_since_last_sync: secondsAgo,
      debounce_seconds: SYNC_DEBOUNCE_MS / 1000
    }
    return { 
      response: new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }),
      data: mockData
    }
  }
  
  console.log('🔍 [SyncCoordinator] Starting new sync')
  
  // Start new sync with token refresh logic
  syncPromise = performSyncWithRetry(authToken).finally(() => {
    syncPromise = null
    lastSyncTime = Date.now()
  })
  
  return syncPromise
}

/**
 * Performs sync with automatic token refresh on 401
 */
async function performSyncWithRetry(authToken?: string): Promise<{ response: Response; data: any }> {
  try {
    // Get fresh session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('❌ [SyncCoordinator] No valid session:', sessionError)
      toast.error('Sesja wygasła. Zaloguj się ponownie.')
      const errorData = { 
        error: 'No session',
        details: 'Session expired or not found'
      }
      return {
        response: new Response(JSON.stringify(errorData), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }),
        data: errorData
      }
    }
    
    const token = authToken || session.access_token
    console.log('✅ [SyncCoordinator] Session valid, attempting sync')
    
    // Call sync API with token
    const response = await fetch('/api/todoist/sync', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    // Handle 401 - try token refresh
    if (response.status === 401) {
      console.warn('⚠️ [SyncCoordinator] 401 Unauthorized - attempting token refresh')
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError || !refreshData.session) {
        console.error('❌ [SyncCoordinator] Token refresh failed:', refreshError)
        
        // Parse error message to provide better feedback
        const errorData = await safeParseJson(response)
        showErrorToast(errorData, response.status)
        
        return { response, data: errorData }
      }
      
      console.log('✅ [SyncCoordinator] Token refreshed, retrying sync')
      
      // Retry with new token
      const retryResponse = await fetch('/api/todoist/sync', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${refreshData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!retryResponse.ok) {
        const errorData = await safeParseJson(retryResponse)
        console.error('❌ [SyncCoordinator] Retry failed:', retryResponse.status, errorData)
        showErrorToast(errorData, retryResponse.status)
        return { response: retryResponse, data: errorData }
      }
      
      const retryData = await retryResponse.json()
      console.log('✅ [SyncCoordinator] Sync successful after retry:', retryData)
      return { response: retryResponse, data: retryData }
    }
    
    // Handle other errors
    if (!response.ok) {
      const errorData = await safeParseJson(response)
      console.error('❌ [SyncCoordinator] Sync failed:', response.status, errorData)
      showErrorToast(errorData, response.status)
      return { response, data: errorData }
    }
    
    // Success!
    const data = await response.json()
    
    // Only show success toast if sync actually happened (not skipped)
    if (!data.skipped && data.success) {
      console.log('✅ [SyncCoordinator] Sync completed successfully:', data)
      // Silent success - no toast for background syncs
    }
    
    return { response, data }
    
  } catch (error) {
    console.error('❌ [SyncCoordinator] Unexpected error:', error)
    toast.error('Nieoczekiwany błąd podczas synchronizacji')
    
    const errorData = { 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    return {
      response: new Response(JSON.stringify(errorData), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }),
      data: errorData
    }
  }
}

/**
 * Background sync that can be called from multiple components
 * Automatically coordinates to prevent redundant syncs
 */
export function startBackgroundSync(authToken?: string, intervalMs: number = 10000): () => void {
  const doSync = () => {
    syncTodoist(authToken).catch(err => 
      console.error('❌ [SyncCoordinator] Background sync failed:', err)
    )
  }
  
  const interval = setInterval(doSync, intervalMs)
  
  // Return cleanup function
  return () => clearInterval(interval)
}
