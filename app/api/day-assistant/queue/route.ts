import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { getQueueState } from '@/lib/services/dayAssistantService'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

/**
 * GET /api/day-assistant/queue
 * 
 * Get user's task queue (NOW/NEXT/LATER)
 * Uses authenticated user context via RLS
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeLater = searchParams.get('includeLater') === 'true'

    // Create authenticated Supabase client
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    console.log(`[Queue API] Fetching queue for authenticated user: ${user.id}`)

    // Fetch queue state with authenticated client (RLS will filter by auth.uid())
    const queueState = await getQueueState(user.id, includeLater, supabase)

    console.log(`[Queue API] Queue state fetched - laterCount: ${queueState.laterCount}`)

    return NextResponse.json(queueState)
  } catch (error) {
    console.error('[Queue API] Error in queue route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
