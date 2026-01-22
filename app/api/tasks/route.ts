/**
 * Unified Task API
 * Manages tasks from all sources (local, Todoist, Asana) through a single endpoint
 * Supports feature flag for backward compatibility
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTasks, createTask, updateTask } from '@/lib/services/dayAssistantV2Service'
import { getOrCreateDayAssistantV2 } from '@/lib/services/dayAssistantV2Service'
import { enqueueSyncJob } from '@/lib/services/syncQueue'

export const dynamic = 'force-dynamic'

/**
 * Helper function to create authenticated Supabase client from request
 */
function createAuthenticatedClient(request: NextRequest) {
  return createClient(
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
}

/**
 * GET /api/tasks - Fetch tasks from unified database
 * Query params:
 * - date: Date string (YYYY-MM-DD) to filter tasks
 * - source: Filter by source ('all', 'local', 'todoist', 'asana')
 * - includeCompleted: Include completed tasks (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json(
        { error: 'Failed to get assistant' },
        { status: 500 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || undefined
    const source = searchParams.get('source') || 'all'
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    console.log('[UnifiedTaskAPI] GET tasks:', { date, source, includeCompleted })

    // Fetch tasks
    const tasks = await getTasks(user.id, assistant.id, {
      date: date,
      includeCompleted: includeCompleted,
      includeAllDates: !date
    })

    // Filter by source if specified
    let filteredTasks = tasks
    if (source !== 'all') {
      filteredTasks = tasks.filter(task => task.source === source)
    }

    // Calculate statistics
    const stats = {
      total: filteredTasks.length,
      completed: filteredTasks.filter(t => t.completed).length,
      bySource: {
        local: filteredTasks.filter(t => t.source === 'local').length,
        todoist: filteredTasks.filter(t => t.source === 'todoist').length,
        asana: filteredTasks.filter(t => t.source === 'asana').length
      }
    }

    console.log('[UnifiedTaskAPI] ✅ Returning', filteredTasks.length, 'tasks')

    return NextResponse.json({
      tasks: filteredTasks,
      stats: stats
    })
  } catch (error) {
    console.error('[UnifiedTaskAPI] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks - Create a new task
 * Body:
 * - title: Task title (required)
 * - description: Task description
 * - priority: Priority (1-4)
 * - due_date: Due date (YYYY-MM-DD)
 * - estimate_min: Estimated duration in minutes
 * - source: Source ('local', 'todoist', 'asana')
 * - sync_to_external: Whether to sync to external service (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json(
        { error: 'Failed to get assistant' },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      title,
      description,
      priority = 3,
      due_date,
      estimate_min = 30,
      source = 'local',
      sync_to_external = false,
      project_id,
      labels = []
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    console.log('[UnifiedTaskAPI] POST create task:', {
      title,
      source,
      sync_to_external
    })

    // Create task in database
    const newTask = await createTask(user.id, assistant.id, {
      title,
      description,
      priority,
      due_date,
      estimate_min,
      source,
      sync_status: sync_to_external ? 'pending' : 'synced',
      metadata: {
        project_id,
        labels
      }
    })

    if (!newTask) {
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    // If sync_to_external is true, enqueue sync job
    if (sync_to_external && source !== 'local') {
      await enqueueSyncJob({
        user_id: user.id,
        task_id: newTask.id,
        operation: 'create',
        source: source as 'todoist' | 'asana',
        payload: {
          title,
          description,
          priority,
          due_date,
          project_id,
          labels
        }
      })
      console.log('[UnifiedTaskAPI] ✅ Sync job enqueued for task:', newTask.id)
    }

    console.log('[UnifiedTaskAPI] ✅ Task created:', newTask.id)

    return NextResponse.json({
      task: newTask,
      sync_queued: sync_to_external && source !== 'local'
    })
  } catch (error) {
    console.error('[UnifiedTaskAPI] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tasks - Update a task
 * Body:
 * - id: Task ID (required)
 * - updates: Object with fields to update
 * - sync_to_external: Whether to sync to external service (default: false)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { id, updates, sync_to_external = false } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    console.log('[UnifiedTaskAPI] PATCH update task:', { id, sync_to_external })

    // Update task in database
    const updatedTask = await updateTask(id, {
      ...updates,
      sync_status: sync_to_external ? 'pending' : updates.sync_status
    })

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    // If sync_to_external is true and task has external_id, enqueue sync job
    if (sync_to_external && updatedTask.external_id && updatedTask.source !== 'local') {
      await enqueueSyncJob({
        user_id: user.id,
        task_id: updatedTask.id,
        operation: 'update',
        source: updatedTask.source as 'todoist' | 'asana',
        payload: {
          external_id: updatedTask.external_id,
          title: updates.title,
          description: updates.description,
          priority: updates.priority,
          due_date: updates.due_date
        }
      })
      console.log('[UnifiedTaskAPI] ✅ Sync job enqueued for task:', updatedTask.id)
    }

    console.log('[UnifiedTaskAPI] ✅ Task updated:', updatedTask.id)

    return NextResponse.json({
      task: updatedTask,
      sync_queued: sync_to_external && !!updatedTask.external_id && updatedTask.source !== 'local'
    })
  } catch (error) {
    console.error('[UnifiedTaskAPI] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks - Delete a task
 * Query params:
 * - id: Task ID (required)
 * - sync_to_external: Whether to sync deletion to external service (default: false)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const sync_to_external = searchParams.get('sync_to_external') === 'true'

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    console.log('[UnifiedTaskAPI] DELETE task:', { id, sync_to_external })

    // Get task first to check if it has external_id
    const { data: task, error: fetchError } = await supabase
      .from('day_assistant_v2_tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // If sync_to_external is true and task has external_id, enqueue sync job
    if (sync_to_external && task.external_id && task.source !== 'local') {
      await enqueueSyncJob({
        user_id: user.id,
        task_id: task.id,
        operation: 'delete',
        source: task.source as 'todoist' | 'asana',
        payload: {
          external_id: task.external_id
        }
      })
      console.log('[UnifiedTaskAPI] ✅ Sync job enqueued for task deletion:', task.id)
    }

    // Delete task from database
    const { error: deleteError } = await supabase
      .from('day_assistant_v2_tasks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[UnifiedTaskAPI] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      )
    }

    console.log('[UnifiedTaskAPI] ✅ Task deleted:', id)

    return NextResponse.json({
      success: true,
      sync_queued: sync_to_external && !!task.external_id && task.source !== 'local'
    })
  } catch (error) {
    console.error('[UnifiedTaskAPI] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
