import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { recordSubtaskFeedback } from '@/lib/services/dayAssistantService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/day-assistant/subtasks/feedback
 * 
 * Record user feedback on subtasks
 * Uses authenticated user context via RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      subtask_id,
      task_id,
      feedback_type,
      feedback_stage,
      detail_level
    } = body

    if (!task_id || !feedback_type || !feedback_stage || !detail_level) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const success = await recordSubtaskFeedback({
      user_id: user.id,
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
