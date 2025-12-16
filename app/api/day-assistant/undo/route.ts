import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { undoLastAction } from '@/lib/services/dayAssistantService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/day-assistant/undo
 * 
 * Undo the last action
 * Uses authenticated user context via RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    console.log('🔍 [API Undo] User:', user.id)

    const success = await undoLastAction(user.id)

    if (!success) {
      console.log('⚠️ [API Undo] No action to undo')
      return NextResponse.json(
        { error: 'No action to undo or failed to undo' },
        { status: 404 }
      )
    }

    console.log('✅ [API Undo] Action undone successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in undo route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
