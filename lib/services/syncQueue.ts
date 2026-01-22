/**
 * Sync Queue Service
 * Manages background synchronization of tasks with external services (Todoist, Asana)
 */

import { supabaseServer } from '@/lib/supabaseServer'
import { getTodoistToken } from '@/lib/integrations'
import type { SupabaseClient } from '@supabase/supabase-js'

// Sync job types
export type SyncOperation = 'create' | 'update' | 'delete' | 'complete'
export type SyncSource = 'todoist' | 'asana'
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface SyncJob {
  id: string
  user_id: string
  task_id: string | null
  operation: SyncOperation
  source: SyncSource
  payload: Record<string, any>
  retry_count: number
  max_retries: number
  status: SyncStatus
  error_message?: string | null
  created_at: string
  processed_at?: string | null
}

/**
 * Enqueue a sync job for background processing
 * @param params - Sync job parameters
 * @param client - Optional Supabase client
 * @returns Created sync job or null on error
 */
export async function enqueueSyncJob(
  params: {
    user_id: string
    task_id?: string | null
    operation: SyncOperation
    source: SyncSource
    payload: Record<string, any>
  },
  client?: SupabaseClient
): Promise<SyncJob | null> {
  const db = client || supabaseServer

  try {
    console.log('[SyncQueue] Enqueueing sync job:', {
      user_id: params.user_id,
      task_id: params.task_id,
      operation: params.operation,
      source: params.source
    })

    const { data, error } = await db
      .from('task_sync_queue')
      .insert({
        user_id: params.user_id,
        task_id: params.task_id || null,
        operation: params.operation,
        source: params.source,
        payload: params.payload,
        status: 'pending',
        retry_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('[SyncQueue] Error enqueueing sync job:', error)
      return null
    }

    console.log('[SyncQueue] ✅ Sync job enqueued:', data.id)
    return data as SyncJob
  } catch (error) {
    console.error('[SyncQueue] Exception enqueueing sync job:', error)
    return null
  }
}

/**
 * Process pending sync jobs from the queue
 * Called by cron job
 * @param maxJobs - Maximum number of jobs to process (default: 10)
 * @param client - Optional Supabase client
 * @returns Statistics about processed jobs
 */
export async function processSyncQueue(
  maxJobs: number = 10,
  client?: SupabaseClient
): Promise<{ processed: number; failed: number; succeeded: number }> {
  const db = client || supabaseServer
  let processed = 0
  let failed = 0
  let succeeded = 0

  try {
    console.log(`[SyncQueue] Processing up to ${maxJobs} pending sync jobs...`)

    // Fetch pending jobs
    const { data: jobs, error: fetchError } = await db
      .from('task_sync_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(maxJobs)

    if (fetchError) {
      console.error('[SyncQueue] Error fetching pending jobs:', fetchError)
      return { processed: 0, failed: 0, succeeded: 0 }
    }

    if (!jobs || jobs.length === 0) {
      console.log('[SyncQueue] No pending jobs to process')
      return { processed: 0, failed: 0, succeeded: 0 }
    }

    console.log(`[SyncQueue] Found ${jobs.length} pending jobs`)

    // Process each job
    for (const job of jobs) {
      processed++

      // Mark as processing
      await db
        .from('task_sync_queue')
        .update({ status: 'processing' })
        .eq('id', job.id)

      // Process based on source
      let success = false
      let errorMessage: string | null = null

      try {
        if (job.source === 'todoist') {
          success = await processTodoistSync(job, db)
        } else if (job.source === 'asana') {
          success = await processAsanaSync(job, db)
        } else {
          errorMessage = `Unknown source: ${job.source}`
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[SyncQueue] Error processing job ${job.id}:`, errorMessage)
      }

      // Update job status
      if (success) {
        succeeded++
        await db
          .from('task_sync_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', job.id)
        console.log(`[SyncQueue] ✅ Job ${job.id} completed successfully`)
      } else {
        // Check if we should retry
        const newRetryCount = (job.retry_count || 0) + 1
        const shouldRetry = newRetryCount < (job.max_retries || 3)

        if (shouldRetry) {
          await db
            .from('task_sync_queue')
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              error_message: errorMessage
            })
            .eq('id', job.id)
          console.log(`[SyncQueue] ⚠️ Job ${job.id} failed, will retry (attempt ${newRetryCount})`)
        } else {
          failed++
          await db
            .from('task_sync_queue')
            .update({
              status: 'failed',
              retry_count: newRetryCount,
              error_message: errorMessage,
              processed_at: new Date().toISOString()
            })
            .eq('id', job.id)
          console.log(`[SyncQueue] ❌ Job ${job.id} failed permanently after ${newRetryCount} attempts`)
        }
      }
    }

    console.log(`[SyncQueue] Processing complete: ${succeeded} succeeded, ${failed} failed, ${processed} total`)
    return { processed, failed, succeeded }
  } catch (error) {
    console.error('[SyncQueue] Fatal error in processSyncQueue:', error)
    return { processed, failed, succeeded }
  }
}

/**
 * Process a Todoist sync job
 * @param job - Sync job to process
 * @param client - Supabase client
 * @returns True if sync succeeded, false otherwise
 */
async function processTodoistSync(job: SyncJob, client: SupabaseClient): Promise<boolean> {
  try {
    console.log(`[SyncQueue] Processing Todoist ${job.operation} for task ${job.task_id}`)

    // Get user's Todoist token
    const token = await getTodoistToken(job.user_id)
    if (!token) {
      console.error('[SyncQueue] No Todoist token found for user')
      return false
    }

    const payload = job.payload

    // Handle different operations
    switch (job.operation) {
      case 'create': {
        // Create task in Todoist
        const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: payload.title,
            description: payload.description || '',
            due_date: payload.due_date || undefined,
            priority: payload.priority || 1,
            project_id: payload.project_id || undefined,
            labels: payload.labels || []
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[SyncQueue] Todoist create failed: ${response.status} - ${errorText}`)
          return false
        }

        const todoistTask = await response.json()
        console.log(`[SyncQueue] ✅ Created Todoist task: ${todoistTask.id}`)

        // Update local task with external_id
        if (job.task_id) {
          await client
            .from('day_assistant_v2_tasks')
            .update({
              external_id: todoistTask.id,
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced'
            })
            .eq('id', job.task_id)
        }

        return true
      }

      case 'update': {
        // Update task in Todoist
        const externalId = payload.external_id
        if (!externalId) {
          console.error('[SyncQueue] No external_id for update operation')
          return false
        }

        const updatePayload: any = {}
        if (payload.title) updatePayload.content = payload.title
        if (payload.description !== undefined) updatePayload.description = payload.description
        if (payload.due_date !== undefined) updatePayload.due_date = payload.due_date
        if (payload.priority !== undefined) updatePayload.priority = payload.priority

        const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${externalId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        })

        if (!response.ok) {
          // If 404, task doesn't exist - consider success
          if (response.status === 404) {
            console.warn('[SyncQueue] Task not found in Todoist (404) - considering success')
            return true
          }
          const errorText = await response.text()
          console.error(`[SyncQueue] Todoist update failed: ${response.status} - ${errorText}`)
          return false
        }

        console.log(`[SyncQueue] ✅ Updated Todoist task: ${externalId}`)

        // Update sync timestamp
        if (job.task_id) {
          await client
            .from('day_assistant_v2_tasks')
            .update({
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced'
            })
            .eq('id', job.task_id)
        }

        return true
      }

      case 'complete': {
        // Complete task in Todoist
        const externalId = payload.external_id
        if (!externalId) {
          console.error('[SyncQueue] No external_id for complete operation')
          return false
        }

        const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${externalId}/close`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          // If 404, task doesn't exist - consider success
          if (response.status === 404) {
            console.warn('[SyncQueue] Task not found in Todoist (404) - considering success')
            return true
          }
          const errorText = await response.text()
          console.error(`[SyncQueue] Todoist complete failed: ${response.status} - ${errorText}`)
          return false
        }

        console.log(`[SyncQueue] ✅ Completed Todoist task: ${externalId}`)
        return true
      }

      case 'delete': {
        // Delete task in Todoist
        const externalId = payload.external_id
        if (!externalId) {
          console.error('[SyncQueue] No external_id for delete operation')
          return false
        }

        const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${externalId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          // If 404, task doesn't exist - consider success
          if (response.status === 404) {
            console.warn('[SyncQueue] Task not found in Todoist (404) - considering success')
            return true
          }
          const errorText = await response.text()
          console.error(`[SyncQueue] Todoist delete failed: ${response.status} - ${errorText}`)
          return false
        }

        console.log(`[SyncQueue] ✅ Deleted Todoist task: ${externalId}`)
        return true
      }

      default:
        console.error(`[SyncQueue] Unknown operation: ${job.operation}`)
        return false
    }
  } catch (error) {
    console.error('[SyncQueue] Exception in processTodoistSync:', error)
    return false
  }
}

/**
 * Process an Asana sync job (placeholder for future implementation)
 * @param job - Sync job to process
 * @param client - Supabase client
 * @returns True if sync succeeded, false otherwise
 */
async function processAsanaSync(job: SyncJob, client: SupabaseClient): Promise<boolean> {
  console.log('[SyncQueue] Asana sync not yet implemented')
  // TODO: Implement Asana sync when Asana integration is ready
  return false
}
