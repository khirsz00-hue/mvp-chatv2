import { NextRequest, NextResponse } from 'next/server'
import { getUserEnergyState, updateEnergyMode } from '@/lib/services/dayAssistantService'
import { supabaseServer } from '@/lib/supabaseServer'
import { EnergyMode } from '@/lib/types/dayAssistant'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

/**
 * GET /api/day-assistant/energy-mode
 * 
 * Get user's current energy mode
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

    const energyState = await getUserEnergyState(userId, supabaseServer)

    if (!energyState) {
      return NextResponse.json(
        { current_mode: 'normal' },
        { status: 200 }
      )
    }

    return NextResponse.json(energyState)
  } catch (error) {
    console.error('Error in energy-mode GET route:', error)
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
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, mode } = body

    if (!userId || !mode) {
      return NextResponse.json(
        { error: 'userId and mode are required' },
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

    const success = await updateEnergyMode(userId, mode, supabaseServer)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update energy mode' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, mode })
  } catch (error) {
    console.error('Error in energy-mode POST route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
