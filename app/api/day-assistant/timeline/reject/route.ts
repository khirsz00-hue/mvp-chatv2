import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// POST: Reject a ghost proposal and remove it
export async function POST(req: Request) {
  try {
    const { userId, eventId } = await req.json()

    if (!userId || !eventId) {
      return NextResponse.json(
        { error: 'Missing userId or eventId' },
        { status: 400 }
      )
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
