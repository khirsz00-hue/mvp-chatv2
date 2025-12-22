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

    const { task_id, steps } = await request.json()

    if (!task_id || !steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Verify task ownership
    const { data: task } = await supabase
      .from('day_assistant_v2_tasks')
      .select('user_id')
      .eq('id', task_id)
      .single()

    if (!task || task.user_id !== user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Create subtasks
    const subtasksToInsert = steps.map((step: any) => ({
      task_id,
      content: step.content,
      estimated_duration: step.estimated_duration,
      position: step.position,
      completed: false
    }))

    const { data: subtasks, error: insertError } = await supabase
      .from('day_assistant_v2_subtasks')
      .insert(subtasksToInsert)
      .select()

    if (insertError) {
      console.error('[Subtasks Bulk] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create subtasks' }, { status: 500 })
    }

    return NextResponse.json({ subtasks })
  } catch (error) {
    console.error('[Subtasks Bulk] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
