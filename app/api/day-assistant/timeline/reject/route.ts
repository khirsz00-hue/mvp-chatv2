import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { validateUUID } from '@/lib/validation/uuid'

// POST: Reject a ghost proposal and remove it
export async function POST(req: Request) {
  try {
    const { userId, eventId } = await req.json()

    console.log('🔍 [API Timeline Reject] Received userId:', userId, 'eventId:', eventId)

    // Validate userId
    const userIdError = validateUUID(userId)
    if (userIdError) {
      console.error('❌ [API Timeline Reject]', userIdError)
      return NextResponse.json({ error: userIdError }, { status: 400 })
    }

    // Validate eventId
    const eventIdError = validateUUID(eventId, 'eventId')
    if (eventIdError) {
      console.error('❌ [API Timeline Reject]', eventIdError)
      return NextResponse.json({ error: eventIdError }, { status: 400 })
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
