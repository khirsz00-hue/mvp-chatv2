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
    console.log('[DayAssistant Queue GET] === Request received ===')
    
    const { searchParams } = new URL(request.url)
    const includeLater = searchParams.get('includeLater') === 'true'

    // Create authenticated Supabase client with cookie context
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    // Return 401 if no authenticated user
    if (!user?.id) {
      console.error('[DayAssistant Queue GET] ✗ No authenticated user - returning 401')
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    console.log(`[DayAssistant Queue GET] ✓ Authenticated user: ${user.id}`)
    
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
