import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createTask, updateTask, deleteTask, getUserTasks } from '@/lib/services/dayAssistantService'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

/**
 * Helper to create authenticated Supabase client
 */
async function createAuthenticatedClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

/**
 * GET /api/day-assistant/tasks
 * 
 * Get all tasks for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    const supabase = await createAuthenticatedClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Tasks API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    console.log(`[Tasks API] Fetching tasks for user: ${user.id}`)

    const tasks = await getUserTasks(user.id, includeCompleted, supabase)

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('[Tasks API] Error in tasks GET route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/day-assistant/tasks
 * 
 * Create a new task for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Tasks API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { task } = body

    if (!task || !task.title) {
      return NextResponse.json(
        { error: 'task.title is required' },
        { status: 400 }
      )
    }

    console.log(`[Tasks API] Creating task for user: ${user.id}`)

    const createdTask = await createTask(user.id, task, supabase)

    if (!createdTask) {
      console.error('[Tasks API] Failed to create task')
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ task: createdTask }, { status: 201 })
  } catch (error) {
    console.error('[Tasks API] Error in tasks POST route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/day-assistant/tasks
 * 
 * Update a task (authenticated user owns task via RLS)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Tasks API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { taskId, ...updates } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    console.log(`[Tasks API] Updating task ${taskId} for user: ${user.id}`)

    const updatedTask = await updateTask(taskId, updates, supabase)

    if (!updatedTask) {
      console.error('[Tasks API] Failed to update task')
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('[Tasks API] Error in tasks PUT route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/day-assistant/tasks
 * 
 * Delete a task (authenticated user owns task via RLS)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Tasks API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    console.log(`[Tasks API] Deleting task ${taskId} for user: ${user.id}`)

    const success = await deleteTask(taskId, supabase)

    if (!success) {
      console.error('[Tasks API] Failed to delete task')
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Tasks API] Error in tasks DELETE route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
