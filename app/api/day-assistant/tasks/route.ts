import { NextRequest, NextResponse } from 'next/server'
import { createTask, updateTask, deleteTask, getUserTasks } from '@/lib/services/dayAssistantService'
import { supabaseServer } from '@/lib/supabaseServer'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

/**
 * GET /api/day-assistant/tasks
 * 
 * Get all tasks for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const tasks = await getUserTasks(userId, includeCompleted, supabaseServer)

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error in tasks GET route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/day-assistant/tasks
 * 
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, task } = body

    if (!userId || !task || !task.title) {
      return NextResponse.json(
        { error: 'userId and task.title are required' },
        { status: 400 }
      )
    }

    const createdTask = await createTask(userId, task, supabaseServer)

    if (!createdTask) {
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ task: createdTask }, { status: 201 })
  } catch (error) {
    console.error('Error in tasks POST route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/day-assistant/tasks
 * 
 * Update a task
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, ...updates } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    const updatedTask = await updateTask(taskId, updates, supabaseServer)

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('Error in tasks PUT route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/day-assistant/tasks
 * 
 * Delete a task
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    const success = await deleteTask(taskId, supabaseServer)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in tasks DELETE route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
