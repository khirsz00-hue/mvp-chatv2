import { NextRequest, NextResponse } from 'next/server'
import { createSubtasks, updateSubtaskCompletion } from '@/lib/services/dayAssistantService'

/**
 * POST /api/day-assistant/subtasks
 * 
 * Create subtasks for a task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task_id, subtasks } = body

    if (!task_id || !subtasks || !Array.isArray(subtasks)) {
      return NextResponse.json(
        { error: 'task_id and subtasks array are required' },
        { status: 400 }
      )
    }

    const createdSubtasks = await createSubtasks(task_id, subtasks)

    return NextResponse.json({ subtasks: createdSubtasks }, { status: 201 })
  } catch (error) {
    console.error('Error in subtasks POST route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/day-assistant/subtasks
 * 
 * Update subtask completion status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { subtask_id, completed } = body

    if (!subtask_id || typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'subtask_id and completed (boolean) are required' },
        { status: 400 }
      )
    }

    const updatedSubtask = await updateSubtaskCompletion(subtask_id, completed)

    if (!updatedSubtask) {
      return NextResponse.json(
        { error: 'Subtask not found or could not be updated' },
        { status: 404 }
      )
    }

    return NextResponse.json({ subtask: updatedSubtask }, { status: 200 })
  } catch (error) {
    console.error('Error in subtasks PATCH route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
