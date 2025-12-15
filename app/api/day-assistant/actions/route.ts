import { NextRequest, NextResponse } from 'next/server'
import { pinTaskToday, postponeTask, escalateTask } from '@/lib/services/dayAssistantService'

/**
 * POST /api/day-assistant/actions
 * 
 * Perform task actions (pin, postpone, escalate)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, taskId, action } = body

    if (!userId || !taskId || !action) {
      return NextResponse.json(
        { error: 'userId, taskId, and action are required' },
        { status: 400 }
      )
    }

    let updatedTask = null

    switch (action) {
      case 'pin':
        updatedTask = await pinTaskToday(userId, taskId)
        break
      case 'postpone':
        updatedTask = await postponeTask(userId, taskId)
        break
      case 'escalate':
        updatedTask = await escalateTask(userId, taskId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to perform action' },
        { status: 500 }
      )
    }

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('Error in actions route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
