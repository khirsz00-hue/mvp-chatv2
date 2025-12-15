import { NextRequest, NextResponse } from 'next/server'
import { undoLastAction } from '@/lib/services/dayAssistantService'

/**
 * POST /api/day-assistant/undo
 * 
 * Undo the last action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const success = await undoLastAction(userId)

    if (!success) {
      return NextResponse.json(
        { error: 'No action to undo or failed to undo' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in undo route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
