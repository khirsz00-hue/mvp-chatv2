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
    
    // Return default state if no authenticated user (don't pass empty string to DB)
    if (!user?.id) {
      console.log('[Energy Mode API GET] No authenticated user, returning default')
      return NextResponse.json(
        { current_mode: 'normal' },
        { status: 200 }
      )
    }

    console.log(`[Energy Mode API GET] Fetching energy state for user: ${user.id}`)

    const energyState = await getUserEnergyState(user.id, supabase)

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
