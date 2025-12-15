import { NextRequest, NextResponse } from 'next/server'
import { createSubtasks } from '@/lib/services/dayAssistantService'

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
