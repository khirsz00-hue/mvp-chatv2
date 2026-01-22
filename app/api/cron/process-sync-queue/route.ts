/**
 * Cron Job Endpoint - Process Sync Queue
 * Processes pending synchronization jobs for external services
 * Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { processSyncQueue } from '@/lib/services/syncQueue'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/process-sync-queue
 * Protected by CRON_SECRET header
 * Processes pending sync jobs and returns statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[CronSyncQueue] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }

    // Check authorization header
    const expectedAuth = `Bearer ${cronSecret}`
    if (authHeader !== expectedAuth) {
      console.error('[CronSyncQueue] Unauthorized cron request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CronSyncQueue] Starting sync queue processing...')

    // Process sync queue
    const stats = await processSyncQueue(10)

    console.log('[CronSyncQueue] ✅ Processing complete:', stats)

    return NextResponse.json({
      success: true,
      stats: stats
    })
  } catch (error) {
    console.error('[CronSyncQueue] Error processing sync queue:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process sync queue',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
