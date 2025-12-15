import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// POST: Approve a ghost proposal and convert it to a task-block
export async function POST(req: Request) {
  try {
    const { userId, eventId } = await req.json()

    if (!userId || !eventId) {
      return NextResponse.json(
        { error: 'Missing userId or eventId' },
        { status: 400 }
      )
    }

    // Update the event type from ghost-proposal to task-block
    const { data, error } = await supabase
      .from('day_timeline_events')
      .update({ type: 'task-block' })
      .eq('id', eventId)
      .eq('user_id', userId)
      .eq('type', 'ghost-proposal')
      .select()
      .single()

    if (error) {
      console.error('Error approving proposal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Proposal not found or already approved' },
        { status: 404 }
      )
    }

    // Update linked tasks if any
    if (data.task_ids && data.task_ids.length > 0) {
      await supabase
        .from('day_assistant_tasks')
        .update({ 
          metadata: { 
            scheduled_at: data.start_time,
            block_id: data.id 
          } 
        })
        .in('id', data.task_ids)
        .eq('user_id', userId)
    }

    return NextResponse.json({ success: true, event: data })
  } catch (err: any) {
    console.error('Error in POST /api/day-assistant/timeline/approve:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
