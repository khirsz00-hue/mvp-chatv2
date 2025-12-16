import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
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
    // Create Supabase client with user's authentication context
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Energy Mode API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    console.log(`[Energy Mode API] Fetching energy mode for authenticated user: ${user.id}`)

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
    // Create Supabase client with user's authentication context
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Energy Mode API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

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

    console.log(`[Energy Mode API] Updating energy mode for user ${user.id} to ${mode}`)

    const success = await updateEnergyMode(user.id, mode, supabase)

    if (!success) {
      console.error('[Energy Mode API] Failed to update energy mode')
      return NextResponse.json(
        { error: 'Failed to update energy mode' },
        { status: 500 }
      )
    }

    console.log(`[Energy Mode API] Successfully updated energy mode to ${mode}`)

    return NextResponse.json({ success: true, mode })
  } catch (error) {
    console.error('[Energy Mode API] Error in energy-mode POST route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
