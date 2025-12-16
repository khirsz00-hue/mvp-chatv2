import { NextRequest, NextResponse } from 'next/server'
import { pinTaskToday, postponeTask, escalateTask } from '@/lib/services/dayAssistantService'
import { validateUUID } from '@/lib/validation/uuid'

/**
 * POST /api/day-assistant/actions
 * 
 * Perform task actions (pin, postpone, escalate)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, taskId, action } = body

    console.log('🔍 [API Actions] Received userId:', userId, 'taskId:', taskId, 'action:', action)

    // Validate userId
    const userIdError = validateUUID(userId)
    if (userIdError) {
      console.error('❌ [API Actions]', userIdError)
      return NextResponse.json({ error: userIdError }, { status: 400 })
    }

    // Validate taskId
    const taskIdError = validateUUID(taskId, 'taskId')
    if (taskIdError) {
      console.error('❌ [API Actions]', taskIdError)
      return NextResponse.json({ error: taskIdError }, { status: 400 })
    }

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
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
      console.error('❌ [API Actions] Failed to perform action')
      return NextResponse.json(
        { error: 'Failed to perform action' },
        { status: 500 }
      )
    }

    console.log(`✅ [API Actions] Action '${action}' completed successfully`)
    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('Error in actions route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
