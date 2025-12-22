import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
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
      console.error('[Delete Task] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taskId = params.taskId

    // Verify ownership
    const { data: task } = await supabase
      .from('day_assistant_v2_tasks')
      .select('user_id')
      .eq('id', taskId)
      .single()

    if (!task || task.user_id !== user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Delete task
    const { error: deleteError } = await supabase
      .from('day_assistant_v2_tasks')
      .delete()
      .eq('id', taskId)

    if (deleteError) {
      console.error('[Delete Task] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Delete Task] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
