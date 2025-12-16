import { NextRequest, NextResponse } from 'next/server'
import { getQueueState } from '@/lib/services/dayAssistantService'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

/**
 * GET /api/day-assistant/queue
 * 
 * Get user's task queue (NOW/NEXT/LATER)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeLater = searchParams.get('includeLater') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const queueState = await getQueueState(userId, includeLater)

    return NextResponse.json(queueState)
  } catch (error) {
    console.error('Error in queue route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
