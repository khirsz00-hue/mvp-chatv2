import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'

export const dynamic = 'force-dynamic'

// POST: Reject a ghost proposal and remove it
// Uses authenticated user context via RLS
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user?.id) {
      console.error('[Timeline Reject API] No authenticated user - session missing')
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const userId = user.id
    const { eventId } = await req.json()

    console.log('🔍 [API Timeline Reject] Authenticated user:', userId, 'eventId:', eventId)

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    // Delete the ghost proposal
    const { error } = await supabase
      .from('day_timeline_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId)
      .eq('type', 'ghost-proposal')

    if (error) {
      console.error('Error rejecting proposal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in POST /api/day-assistant/timeline/reject:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
