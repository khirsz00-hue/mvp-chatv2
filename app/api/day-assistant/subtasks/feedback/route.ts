import { NextRequest, NextResponse } from 'next/server'
import { recordSubtaskFeedback } from '@/lib/services/dayAssistantService'

/**
 * POST /api/day-assistant/subtasks/feedback
 * 
 * Record user feedback on subtasks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      subtask_id,
      task_id,
      feedback_type,
      feedback_stage,
      detail_level
    } = body

    if (!userId || !task_id || !feedback_type || !feedback_stage || !detail_level) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const success = await recordSubtaskFeedback({
      user_id: userId,
      subtask_id,
      task_id,
      feedback_type,
      feedback_stage,
      detail_level
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in subtasks feedback route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
