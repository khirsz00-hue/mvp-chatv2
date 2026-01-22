/**
 * API Route: /api/tasks/sync
 * POST: Unified sync endpoint for all task sources (Todoist, Asana, local)
 * 
 * This endpoint implements the unified synchronization service that syncs tasks
 * from all enabled integrations to the day_assistant_v2_tasks table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { unifiedSyncService } from '@/lib/services/unifiedSyncService'
import { getOrCreateDayAssistantV2 } from '@/lib/services/dayAssistantV2Service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel: max 60s dla sync

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. Auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 2. Get or create assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // 3. Parse request body (optional filters)
    const body = await req.json().catch(() => ({}))
    const { sources, force } = body
    
    console.log('[UnifiedSync API] Starting sync for user:', user.id, {
      sources: sources || 'all',
      force: force || false
    })
    
    // 4. Run unified sync
    const result = await unifiedSyncService.syncAll({
      userId: user.id,
      assistantId: assistant.id,
      sources,
      force
    })
    
    // 5. Return result
    return NextResponse.json({
      success: result.success,
      message: `Synced ${result.totalCreated + result.totalUpdated} tasks from ${result.syncedSources.join(', ')}`,
      stats: {
        created: result.totalCreated,
        updated: result.totalUpdated,
        deleted: result.totalDeleted,
        errors: result.errors.length
      },
      sources: result.syncedSources,
      errors: result.errors,
      duration: result.duration
    })
    
  } catch (error) {
    console.error('[UnifiedSync API] ❌ Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }, { status: 500 })
  }
}
