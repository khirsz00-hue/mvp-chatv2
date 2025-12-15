import { NextRequest, NextResponse } from 'next/server'
import { getQueueState } from '@/lib/services/dayAssistantService'

/**
 * GET /api/day-assistant/queue
 * 
 * Get user's task queue (NOW/NEXT/LATER)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const queueState = await getQueueState(userId)

    return NextResponse.json(queueState)
  } catch (error) {
    console.error('Error in queue route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
