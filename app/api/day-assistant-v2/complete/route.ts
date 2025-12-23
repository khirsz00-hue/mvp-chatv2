/**
 * API Route: /api/day-assistant-v2/complete
 * POST: Mark task as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2
} from '@/lib/services/dayAssistantV2Service'

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
    
    // Sync to Todoist
    const todoistRef = task?.todoist_id || task?.todoist_task_id
    if (todoistRef) {
      const { syncTaskChangeToTodoist } = await import('@/lib/services/dayAssistantV2Service')
      await syncTaskChangeToTodoist(user.id, todoistRef, {
        completed: true
      })
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
