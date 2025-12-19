/**
 * Global Todoist Sync Coordinator
 * Prevents redundant sync operations when multiple components are active
 */

let syncPromise: Promise<Response> | null = null
let lastSyncTime = 0
const SYNC_DEBOUNCE_MS = 30000 // 30 seconds - sensible interval for Todoist API to avoid rate limiting

/**
 * Coordinated sync that prevents concurrent/redundant syncs
 * @param authToken - Bearer token for authentication
 * @returns Promise that resolves when sync completes
 */
export async function syncTodoist(authToken: string): Promise<Response> {
  const now = Date.now()
  
  // If there's an ongoing sync, reuse it
  if (syncPromise) {
    console.log('[SyncCoordinator] Reusing ongoing sync')
    return syncPromise
  }
  
  // If last sync was recent, skip
  const timeSinceLastSync = now - lastSyncTime
  if (timeSinceLastSync < SYNC_DEBOUNCE_MS) {
    const secondsAgo = Math.floor(timeSinceLastSync / 1000)
    console.log(`[SyncCoordinator] Skipping - last sync was ${secondsAgo}s ago (debounce: ${SYNC_DEBOUNCE_MS / 1000}s)`)
    // Return a mock successful response indicating sync was skipped
    return new Response(JSON.stringify({ 
      message: 'Sync skipped - too soon',
      skipped: true,
      seconds_since_last_sync: secondsAgo,
      debounce_seconds: SYNC_DEBOUNCE_MS / 1000
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  console.log('[SyncCoordinator] Starting new sync')
  
  // Start new sync
  syncPromise = fetch('/api/todoist/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` }
  }).finally(() => {
    syncPromise = null
    lastSyncTime = Date.now()
  })
  
  return syncPromise
}

/**
 * Background sync that can be called from multiple components
 * Automatically coordinates to prevent redundant syncs
 */
export function startBackgroundSync(authToken: string, intervalMs: number = 10000): () => void {
  const doSync = () => {
    syncTodoist(authToken).catch(err => 
      console.error('[SyncCoordinator] Background sync failed:', err)
    )
  }
  
  const interval = setInterval(doSync, intervalMs)
  
  // Return cleanup function
  return () => clearInterval(interval)
}
