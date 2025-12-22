import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[Reorder Task] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { task_id, new_position } = await request.json()

    if (!task_id || typeof new_position !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Verify task ownership
    const { data: task } = await supabase
      .from('day_assistant_v2_tasks')
      .select('user_id, position')
      .eq('id', task_id)
      .single()

    if (!task || task.user_id !== user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Update task position
    const { error: updateError } = await supabase
      .from('day_assistant_v2_tasks')
      .update({ position: new_position })
      .eq('id', task_id)

    if (updateError) {
      console.error('[Reorder Task] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to reorder task' }, { status: 500 })
    }

    return NextResponse.json({ success: true, task_id, new_position })
  } catch (error) {
    console.error('[Reorder Task] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
