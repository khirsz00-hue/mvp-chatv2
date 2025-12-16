import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { getUserEnergyState, updateEnergyMode } from '@/lib/services/dayAssistantService'
import { EnergyMode } from '@/lib/types/dayAssistant'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

/**
 * GET /api/day-assistant/energy-mode
 * 
 * Get user's current energy mode
 * Uses authenticated user context via RLS
 */
export async function GET(request: NextRequest) {
  try {
    // Create authenticated Supabase client with cookie context
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    // Log auth status for debugging - don't block if user is null
    // RLS policies will handle data access control at database level
    if (user) {
      console.log(`[Energy Mode API GET] Authenticated user: ${user.id}`)
    } else {
      console.log(`[Energy Mode API GET] No user in session - RLS will filter results`)
    }

    // Use user.id if available, otherwise RLS will return empty results
    const userId = user?.id || ''

    const energyState = await getUserEnergyState(userId, supabase)

    if (!energyState) {
      console.log('[Energy Mode API] No energy state found, returning default')
      return NextResponse.json(
        { current_mode: 'normal' },
        { status: 200 }
      )
    }

    console.log(`[Energy Mode API] Energy state fetched - mode: ${energyState.current_mode}`)

    return NextResponse.json(energyState)
  } catch (error) {
    console.error('[Energy Mode API] Error in energy-mode GET route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/day-assistant/energy-mode
 * 
 * Update user's energy mode
 * Uses authenticated user context via RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Create authenticated Supabase client with cookie context
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    // POST operations that modify data require authenticated user
    if (!user) {
      console.log(`[Energy Mode API POST] No user in session - returning error`)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }
    
    console.log(`[Energy Mode API POST] Authenticated user: ${user.id}`)

    const body = await request.json()
    const { mode } = body

    if (!mode) {
      return NextResponse.json(
        { error: 'mode is required' },
        { status: 400 }
      )
    }

    // Validate mode
    const validModes: EnergyMode[] = ['crisis', 'normal', 'flow']
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid energy mode' },
        { status: 400 }
      )
    }

    console.log(`[Energy Mode API POST] Updating energy mode for user ${user.id} to ${mode}`)

    const success = await updateEnergyMode(user.id, mode, supabase)

    if (!success) {
      console.error('[Energy Mode API] Failed to update energy mode')
      return NextResponse.json(
        { error: 'Failed to update energy mode' },
        { status: 500 }
      )
    }

    console.log(`[Energy Mode API POST] Successfully updated energy mode to ${mode}`)

    return NextResponse.json({ success: true, mode })
  } catch (error) {
    console.error('[Energy Mode API] Error in energy-mode POST route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
