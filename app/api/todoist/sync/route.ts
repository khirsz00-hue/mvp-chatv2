/**
 * API Route: /api/todoist/sync
 * POST: Sync Todoist tasks to Supabase (cache-aware)
 * 
 * This endpoint implements centralized synchronization of Todoist tasks to Supabase.
 * It ensures both TasksAssistant and DayAssistantV2 use the same data source.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SYNC_INTERVAL_MS = 10000 // 10 seconds cache

interface TodoistTask {
  id: string
  content: string
  description?: string
  priority: number
  labels?: string[]
  due?: {
    date: string
  } | null
  project_id?: string
  created_at?: string
}

interface DayAssistantV2Task {
  user_id: string
  assistant_id: string
  todoist_id: string
  title: string
  description: string | null
  priority: number
  is_must: boolean
  is_important: boolean
  estimate_min: number
  cognitive_load: number
  context_type: string
  due_date: string | null
  todoist_task_id: string
  synced_at: string
}

/**
 * Map Todoist task to DayAssistantV2Task format
 */
function mapTodoistToDayAssistantTask(
  task: TodoistTask,
  userId: string,
  assistantId: string
): Partial<DayAssistantV2Task> | null {
  // Validate required fields
  if (!task.id) {
    console.warn('[Sync] Skipping task without ID:', task)
    return null
  }
  
  if (!task.content) {
    console.warn('[Sync] Skipping task without content:', task.id)
    return null
  }

  // Determine context_type from labels
  let contextType = 'code' // default
  if (task.labels) {
    if (task.labels.includes('admin')) contextType = 'admin'
    else if (task.labels.includes('komunikacja')) contextType = 'komunikacja'
    else if (task.labels.includes('prywatne')) contextType = 'prywatne'
  }

  // Determine is_must: labels include 'must' OR priority === 4 (P1 in Todoist)
  const isMust = task.labels?.includes('must') || task.priority === 4

  // Determine is_important: priority >= 3
  const isImportant = task.priority >= 3

  // Calculate cognitive_load: Math.min(5 - priority + 1, 5)
  // Priority in Todoist: 1 (lowest) to 4 (highest/P1)
  // Cognitive load: 1 (light) to 5 (heavy)
  const cognitiveLoad = Math.min(5 - task.priority + 1, 5)

  return {
    user_id: userId,
    assistant_id: assistantId,
    todoist_id: task.id, // Primary reference to Todoist task
    todoist_task_id: task.id, // Legacy field for compatibility with existing code
    title: task.content,
    description: task.description || null,
    priority: task.priority,
    is_must: isMust,
    is_important: isImportant,
    estimate_min: 30, // default
    cognitive_load: cognitiveLoad,
    context_type: contextType,
    due_date: task.due?.date || null,
    synced_at: new Date().toISOString(),
    // Add required fields with default values for validation
    tags: [],
    position: 0,
    postpone_count: 0,
    auto_moved: false,
    metadata: {},
    completed: false
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    )

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check cache - has sync happened recently?
    const { data: syncMeta } = await supabase
      .from('sync_metadata')
      .select('last_synced_at')
      .eq('user_id', user.id)
      .eq('sync_type', 'todoist')
      .single()

    if (syncMeta?.last_synced_at) {
      const lastSyncTime = new Date(syncMeta.last_synced_at).getTime()
      const now = Date.now()
      const timeSinceSync = now - lastSyncTime

      if (timeSinceSync < SYNC_INTERVAL_MS) {
        const secondsSince = Math.floor(timeSinceSync / 1000)
        console.log(`[Sync] Skipping - last sync was ${secondsSince}s ago`)
        return NextResponse.json({
          message: 'Sync skipped - too soon',
          last_synced: syncMeta.last_synced_at,
          seconds_since: secondsSince
        })
      }
    }

    // Get Todoist token
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('todoist_token')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Sync] Error fetching Todoist token:', profileError)
    }

    const todoistToken = profile?.todoist_token
    if (!todoistToken) {
      return NextResponse.json(
        { error: 'Todoist token not found - please connect your account' },
        { status: 400 }
      )
    }

    // Fetch all tasks from Todoist API
    let todoistResponse = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: {
        Authorization: `Bearer ${todoistToken}`
      },
      cache: 'no-store'
    })

    // Handle 401 Unauthorized - token might be expired or invalid
    if (todoistResponse.status === 401) {
      console.error('[Sync] Todoist API 401 Unauthorized - token might be expired')
      
      // Try to refresh the token or clear it
      // For now, we'll clear the token and ask user to reconnect
      const { error: clearError } = await supabase
        .from('user_profiles')
        .update({ todoist_token: null })
        .eq('id', user.id)
      
      if (clearError) {
        console.error('[Sync] Error clearing invalid token:', clearError)
      }
      
      return NextResponse.json(
        { 
          error: 'Todoist authorization expired - please reconnect your account',
          error_code: 'TODOIST_AUTH_EXPIRED',
          needs_reconnect: true
        },
        { status: 401 }
      )
    }

    if (!todoistResponse.ok) {
      console.error(`[Sync] Todoist API error: ${todoistResponse.status}`)
      return NextResponse.json(
        { 
          error: `Failed to fetch tasks from Todoist (${todoistResponse.status})`,
          error_code: 'TODOIST_API_ERROR',
          status_code: todoistResponse.status
        },
        { status: todoistResponse.status }
      )
    }

    const todoistTasks: TodoistTask[] = await todoistResponse.json()

    // Get or create assistant
    let { data: assistant } = await supabase
      .from('assistant_config')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'asystent dnia v2')
      .single()

    if (!assistant) {
      // Create assistant if it doesn't exist
      const { data: newAssistant, error: createError } = await supabase
        .from('assistant_config')
        .insert({
          user_id: user.id,
          name: 'asystent dnia v2',
          type: 'day_planner',
          settings: {
            undo_window_seconds: 15,
            max_postpones: 5,
            morning_must_block: true,
            light_task_limit_minutes: 120
          },
          is_active: true
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[Sync] Error creating assistant:', createError)
        return NextResponse.json(
          { error: 'Failed to create assistant' },
          { status: 500 }
        )
      }

      assistant = newAssistant
    }

    const assistantId = assistant.id

    // Map Todoist tasks to DayAssistantV2Task format
    // Filter out invalid tasks that couldn't be mapped
    const mappedTasks = todoistTasks
      .map(task => {
        try {
          return mapTodoistToDayAssistantTask(task, user.id, assistantId)
        } catch (error) {
          console.error('[Sync] Error mapping task:', task.id, error)
          return null
        }
      })
      .filter((task): task is Partial<DayAssistantV2Task> => task !== null)
    
    const skippedCount = todoistTasks.length - mappedTasks.length
    if (skippedCount > 0) {
      console.warn(`[Sync] Skipped ${skippedCount} invalid tasks out of ${todoistTasks.length}`)
    }
    console.log(`[Sync] Mapped ${mappedTasks.length} valid tasks from ${todoistTasks.length} Todoist tasks`)

    // Delete old synced tasks that are no longer in Todoist
    const todoistIds = todoistTasks.map(t => t.id)
    
    // Get all existing synced tasks
    const { data: existingTasks } = await supabase
      .from('day_assistant_v2_tasks')
      .select('id, todoist_id')
      .eq('user_id', user.id)
      .eq('assistant_id', assistantId)
      .not('todoist_id', 'is', null)
    
    // Find tasks to delete (tasks that exist in DB but not in Todoist)
    if (existingTasks && existingTasks.length > 0) {
      const tasksToDelete = existingTasks
        .filter(task => task.todoist_id && !todoistIds.includes(task.todoist_id))
        .map(task => task.id)
      
      if (tasksToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('day_assistant_v2_tasks')
          .delete()
          .in('id', tasksToDelete)

        if (deleteError) {
          console.error('[Sync] Error deleting old tasks:', deleteError)
        } else {
          console.log(`[Sync] Deleted ${tasksToDelete.length} stale tasks`)
        }
      }
    }

    // Upsert tasks (update existing, insert new)
    // Use Supabase's upsert with ignoreDuplicates to handle the partial unique index
    // The unique constraint is on (user_id, assistant_id, todoist_id) WHERE todoist_id IS NOT NULL
    if (mappedTasks.length > 0) {
      console.log(`[Sync] Upserting ${mappedTasks.length} tasks with conflict resolution`)
      
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      // Process tasks in batches of 10 to avoid overwhelming the database
      const batchSize = 10
      for (let i = 0; i < mappedTasks.length; i += batchSize) {
        const batch = mappedTasks.slice(i, i + batchSize)
        
        // For each task, try to upsert individually to handle conflicts properly
        for (const task of batch) {
          try {
            // First, try to find existing task by todoist_id
            const { data: existingTask } = await supabase
              .from('day_assistant_v2_tasks')
              .select('id')
              .eq('user_id', user.id)
              .eq('assistant_id', assistantId)
              .eq('todoist_id', task.todoist_id!)
              .maybeSingle()

            if (existingTask) {
              // Update existing task
              const { error: updateError } = await supabase
                .from('day_assistant_v2_tasks')
                .update({
                  ...task,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingTask.id)

              if (updateError) {
                console.error('[Sync] Error updating task:', task.todoist_id, updateError)
                errorCount++
                errors.push(`Update failed for task ${task.todoist_id}: ${updateError.message}`)
              } else {
                successCount++
              }
            } else {
              // Insert new task
              const { error: insertError } = await supabase
                .from('day_assistant_v2_tasks')
                .insert(task)

              if (insertError) {
                // If it's a duplicate key error, try to update instead
                if (insertError.code === '23505') {
                  console.warn('[Sync] Duplicate key on insert, attempting update for:', task.todoist_id)
                  
                  // Fetch the task again and update
                  const { data: retryExisting } = await supabase
                    .from('day_assistant_v2_tasks')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('assistant_id', assistantId)
                    .eq('todoist_id', task.todoist_id!)
                    .maybeSingle()

                  if (retryExisting) {
                    const { error: retryError } = await supabase
                      .from('day_assistant_v2_tasks')
                      .update({
                        ...task,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', retryExisting.id)

                    if (retryError) {
                      console.error('[Sync] Retry update failed:', task.todoist_id, retryError)
                      errorCount++
                      errors.push(`Retry update failed for task ${task.todoist_id}: ${retryError.message}`)
                    } else {
                      successCount++
                    }
                  } else {
                    errorCount++
                    errors.push(`Could not find duplicate task ${task.todoist_id} after 23505 error`)
                  }
                } else {
                  console.error('[Sync] Error inserting task:', task.todoist_id, insertError)
                  errorCount++
                  errors.push(`Insert failed for task ${task.todoist_id}: ${insertError.message}`)
                }
              } else {
                successCount++
              }
            }
          } catch (err) {
            console.error('[Sync] Error processing task:', task.todoist_id, err)
            errorCount++
            errors.push(`Processing failed for task ${task.todoist_id}`)
          }
        }
      }

      console.log(`[Sync] Processed ${successCount} tasks successfully, ${errorCount} errors`)

      if (errorCount > 0 && successCount === 0) {
        // All tasks failed
        return NextResponse.json(
          { 
            error: 'Failed to sync all tasks', 
            details: errors.join('; '),
            success_count: successCount,
            error_count: errorCount
          },
          { status: 500 }
        )
      } else if (errorCount > 0) {
        // Partial success - log but continue
        console.warn('[Sync] Partial sync - some tasks failed:', errors.slice(0, 5))
      }
    }

    // Update sync metadata
    const now = new Date().toISOString()
    const { error: metaError } = await supabase
      .from('sync_metadata')
      .upsert({
        user_id: user.id,
        sync_type: 'todoist',
        last_synced_at: now,
        task_count: mappedTasks.length
      }, {
        onConflict: 'user_id,sync_type'
      })

    if (metaError) {
      console.error('[Sync] Error updating sync metadata:', metaError)
    }

    console.log(`[Sync] ✅ Synced ${mappedTasks.length} tasks from Todoist`)

    return NextResponse.json({
      success: true,
      synced_at: now,
      task_count: mappedTasks.length,
      message: `Successfully synced ${mappedTasks.length} tasks`
    })

  } catch (error) {
    console.error('[Sync] ❌ Error in sync:', error)
    return NextResponse.json(
      { error: 'Internal server error during sync' },
      { status: 500 }
    )
  }
}
