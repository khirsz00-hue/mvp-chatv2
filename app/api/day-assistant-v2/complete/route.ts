/**
 * API Route: /api/day-assistant-v2/complete
 * POST: Mark task as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2
} from '@/lib/services/dayAssistantV2Service'

async function completeTodoistTask(token: string, todoistId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${todoistId}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      console.warn('[day-assistant-v2/complete] Failed to close Todoist task', todoistId, res.status)
      return false
    }
    return true
  } catch (error) {
    console.error('[day-assistant-v2/complete] Error closing Todoist task:', error)
    return false
  }
}

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
    
    const body = await request.json()
    const { task_id } = body
    
    if (!task_id) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
    }
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Get task to check for todoist_id
    const { data: task } = await supabase
      .from('day_assistant_v2_tasks')
      .select('todoist_id, todoist_task_id')
      .eq('id', task_id)
      .single()
    
    // Complete in Todoist if it has a todoist_id
    if (task?.todoist_id || task?.todoist_task_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('todoist_token')
        .eq('id', user.id)
        .single()
      
      if (profile?.todoist_token) {
        const todoistId = task.todoist_id || task.todoist_task_id
        await completeTodoistTask(profile.todoist_token, todoistId)
      }
    }
    
    // Mark as completed in our database
    const { data: updatedTask, error: updateError } = await supabase
      .from('day_assistant_v2_tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', task_id)
      .select()
      .single()
    
    if (updateError) {
      console.error('[day-assistant-v2/complete] Error updating task:', updateError)
      return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: '✅ Zadanie ukończone'
    })
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/complete:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
