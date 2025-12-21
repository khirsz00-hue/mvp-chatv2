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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { task_id, content, estimated_duration } = await request.json()

    // Verify task belongs to user
    const { data: task } = await supabase
      .from('day_assistant_v2_tasks')
      .select('user_id')
      .eq('id', task_id)
      .single()

    if (!task || task.user_id !== user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get current subtask count for position
    const { count } = await supabase
      .from('day_assistant_v2_subtasks')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', task_id)

    // Create subtask
    const { data: subtask, error: insertError } = await supabase
      .from('day_assistant_v2_subtasks')
      .insert({
        task_id,
        content,
        estimated_duration: estimated_duration || 15,
        completed: false,
        position: (count || 0) + 1
      })
      .select()
      .single()

    if (insertError) {
      console.error('[subtasks] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 })
    }

    return NextResponse.json({ subtask })
  } catch (error) {
    console.error('[subtasks] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subtask_id, completed } = await request.json()

    // Update subtask
    const { error: updateError } = await supabase
      .from('day_assistant_v2_subtasks')
      .update({ 
        completed,
        completed_at: completed ? new Date().toISOString() : null
      })
      .eq('id', subtask_id)

    if (updateError) {
      console.error('[subtasks] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[subtasks] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
