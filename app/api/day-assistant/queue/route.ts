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
    
    // Log auth status for debugging - don't block if user is null
    // RLS policies will handle data access control at database level
    if (user) {
      console.log(`[Queue API] Authenticated user: ${user.id}`)
    } else {
      console.log(`[Queue API] No user in session - RLS will filter results`)
    }

    // Use user.id if available, otherwise RLS will return empty results
    const userId = user?.id || ''

    // Fetch queue state with authenticated client (RLS will filter by auth.uid())
    const queueState = await getQueueState(userId, includeLater, supabase)

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
