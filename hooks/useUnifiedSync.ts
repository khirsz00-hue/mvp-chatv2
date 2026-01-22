/**
 * useUnifiedSync Hook
 * Frontend hook for triggering unified sync across all task sources
 */

import { useState, useCallback } from 'react'
import { supabase as supabaseClient } from '@/lib/supabaseClient'

interface SyncStats {
  created: number
  updated: number
  deleted: number
  errors: number
}

interface UseSyncResult {
  syncing: boolean
  lastSync: Date | null
  stats: SyncStats | null
  error: string | null
  sync: (options?: { sources?: string[], force?: boolean }) => Promise<void>
}

export function useUnifiedSync(): UseSyncResult {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const sync = useCallback(async (options = {}) => {
    setSyncing(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch('/api/tasks/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Sync failed')
      }
      
      const result = await response.json()
      
      setStats(result.stats)
      setLastSync(new Date())
      
      console.log('[useUnifiedSync] ✅ Sync completed:', result)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[useUnifiedSync] ❌ Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }, [])
  
  return { syncing, lastSync, stats, error, sync }
}
