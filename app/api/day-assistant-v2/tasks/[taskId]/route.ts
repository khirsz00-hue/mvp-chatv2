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

    // Get task to check for todoist_id
    const { data: task } = await supabase
      .from('day_assistant_v2_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (!task || task.user_id !== user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Delete from Todoist first
    const todoistRef = task.todoist_id ?? task.todoist_task_id
    if (todoistRef) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('todoist_token')
          .eq('id', user.id)
          .single()
        
        if (profile?.todoist_token) {
          const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${todoistRef}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${profile.todoist_token}`
            }
          })
          
          if (!response.ok) {
            console.warn('[Delete Task] Failed to delete from Todoist:', response.status)
          } else {
            console.log('[Delete Task] ✅ Deleted from Todoist:', todoistRef)
          }
        }
      } catch (error) {
        console.error('[Delete Task] Error deleting from Todoist:', error)
        // Continue with local delete even if Todoist fails
      }
    }

    // Delete task from Supabase
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
