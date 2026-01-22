/**
 * Background Sync Service
 * Phase 2A: Synchronizes in background every X seconds without blocking UI
 */

let syncInterval: NodeJS.Timeout | null = null
let isSyncing = false

export function startBackgroundSync(
  syncFn: () => Promise<void>,
  intervalMs: number = 30000 // 30s default
) {
  if (syncInterval) {
    console.warn('[BackgroundSync] Already running')
    return
  }
  
  console.log('[BackgroundSync] Starting background sync (interval:', intervalMs, 'ms)')
  
  // Initial sync
  syncInBackground(syncFn)
  
  // Periodic sync
  syncInterval = setInterval(() => {
    syncInBackground(syncFn)
  }, intervalMs)
}

export function stopBackgroundSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('[BackgroundSync] Stopped')
  }
}

async function syncInBackground(syncFn: () => Promise<void>) {
  if (isSyncing) {
    console.log('[BackgroundSync] Skipping - sync already in progress')
    return
  }
  
  isSyncing = true
  
  try {
    await syncFn()
  } catch (error) {
    console.error('[BackgroundSync] Error:', error)
  } finally {
    isSyncing = false
  }
}
