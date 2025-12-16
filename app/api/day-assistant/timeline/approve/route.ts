import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'

export const dynamic = 'force-dynamic'

// POST: Approve a ghost proposal and convert it to a task-block
// Uses authenticated user context via RLS
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user?.id) {
      console.error('[Timeline Approve API] No authenticated user - session missing')
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const userId = user.id
    const { eventId } = await req.json()

    console.log('🔍 [API Timeline Approve] Authenticated user:', userId, 'eventId:', eventId)

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
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
      // Fetch existing tasks to merge metadata
      const { data: tasks } = await supabase
        .from('day_assistant_tasks')
        .select('id, metadata')
        .in('id', data.task_ids)
        .eq('user_id', userId)

      // Update each task with merged metadata
      if (tasks) {
        for (const task of tasks) {
          await supabase
            .from('day_assistant_tasks')
            .update({ 
              metadata: { 
                ...(task.metadata || {}),
                scheduled_at: data.start_time,
                block_id: data.id 
              } 
            })
            .eq('id', task.id)
            .eq('user_id', userId)
        }
      }
    }

    return NextResponse.json({ success: true, event: data })
  } catch (err: any) {
    console.error('Error in POST /api/day-assistant/timeline/approve:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
