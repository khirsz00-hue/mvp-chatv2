/**
 * API Route: /api/todoist/sync
 * POST: Sync Todoist tasks to Supabase (cache-aware)
 * 
 * This endpoint implements centralized synchronization of Todoist tasks to Supabase.
 * It ensures both TasksAssistant and DayAssistantV2 use the same data source.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTodoistToken } from '@/lib/integrations'

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

interface TestDayTask {
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
 * Map Todoist task to TestDayTask format
 */
function mapTodoistToTestDayTask(
  task: TodoistTask,
  userId: string,
  assistantId: string
): Partial<TestDayTask> {
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
    todoist_id: task.id,
    todoist_task_id: task.id,
    title: task.content,
    description: task.description || null,
    priority: task.priority,
    is_must: isMust,
    is_important: isImportant,
    estimate_min: 30, // default
    cognitive_load: cognitiveLoad,
    context_type: contextType,
    due_date: task.due?.date || null,
    synced_at: new Date().toISOString()
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
    const todoistToken = await getTodoistToken(user.id)
    if (!todoistToken) {
      return NextResponse.json(
        { error: 'Todoist token not found - please connect your account' },
        { status: 400 }
      )
    }

    // Fetch all tasks from Todoist API
    const todoistResponse = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: {
        Authorization: `Bearer ${todoistToken}`
      },
      cache: 'no-store'
    })

    if (!todoistResponse.ok) {
      console.error(`[Sync] Todoist API error: ${todoistResponse.status}`)
      return NextResponse.json(
        { error: 'Failed to fetch tasks from Todoist' },
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

    // Map Todoist tasks to TestDayTask format
    const mappedTasks = todoistTasks.map(task =>
      mapTodoistToTestDayTask(task, user.id, assistantId)
    )

    // Delete old synced tasks that are no longer in Todoist
    const todoistIds = todoistTasks.map(t => t.id)
    
    // Only attempt deletion if there are Todoist IDs to compare against
    if (todoistIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('test_day_assistant_tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('assistant_id', assistantId)
        .not('todoist_id', 'is', null)
        .not('todoist_id', 'in', `(${todoistIds.join(',')})`)

      if (deleteError) {
        console.error('[Sync] Error deleting old tasks:', deleteError)
      }
    } else {
      // If no tasks from Todoist, delete all synced tasks
      const { error: deleteError } = await supabase
        .from('test_day_assistant_tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('assistant_id', assistantId)
        .not('todoist_id', 'is', null)

      if (deleteError) {
        console.error('[Sync] Error deleting old tasks:', deleteError)
      }
    }

    // Upsert tasks (update existing, insert new)
    // Strategy: For each task, check if it exists by todoist_id, then update or insert
    if (mappedTasks.length > 0) {
      for (const task of mappedTasks) {
        // Check if task with this todoist_id already exists
        const { data: existing } = await supabase
          .from('test_day_assistant_tasks')
          .select('id')
          .eq('user_id', user.id)
          .eq('assistant_id', assistantId)
          .eq('todoist_id', task.todoist_id)
          .single()

        if (existing) {
          // Update existing task
          const { error: updateError } = await supabase
            .from('test_day_assistant_tasks')
            .update(task)
            .eq('id', existing.id)

          if (updateError) {
            console.error(`[Sync] Error updating task ${task.todoist_id}:`, updateError)
          }
        } else {
          // Insert new task
          const { error: insertError } = await supabase
            .from('test_day_assistant_tasks')
            .insert(task)

          if (insertError) {
            console.error(`[Sync] Error inserting task ${task.todoist_id}:`, insertError)
          }
        }
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
