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

    // Create authenticated Supabase client with cookie context
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    // Return empty queue if no authenticated user (don't pass empty string to DB)
    if (!user?.id) {
      console.error('[Queue API] No authenticated user')
      return NextResponse.json({
        now: null,
        next: [],
        later: [],
        laterCount: 0
      })
    }

    console.log(`[Queue API] Fetching queue for user: ${user.id}`)
    
    // Fetch queue state with authenticated client (RLS will filter by auth.uid())
    const queueState = await getQueueState(user.id, includeLater, supabase)

    console.log(`✅ [Queue API] Queue state: laterCount: ${queueState.laterCount}`)

    return NextResponse.json(queueState)
  } catch (error) {
    console.error('[Queue API] Error in queue route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
