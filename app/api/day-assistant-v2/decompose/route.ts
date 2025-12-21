/**
 * API Route: /api/day-assistant-v2/decompose
 * POST: Decompose task into smaller subtasks
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
    const { task_id, target_duration = 25 } = body
    
    if (!task_id) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
    }
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('day_assistant_v2_tasks')
      .select('*')
      .eq('id', task_id)
      .single()
    
    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    // Simple decomposition: split task into smaller chunks
    // TODO: Use AI for intelligent decomposition
    const estimateMinutes = task.estimate_min || 60
    const numberOfSubtasks = Math.ceil(estimateMinutes / target_duration)
    
    const subtasks = []
    for (let i = 0; i < numberOfSubtasks; i++) {
      const { data: subtask, error: subtaskError } = await supabase
        .from('day_assistant_v2_subtasks')
        .insert({
          task_id: task_id,
          content: `${task.title} - Część ${i + 1}/${numberOfSubtasks}`,
          estimated_duration: Math.min(target_duration, estimateMinutes - (i * target_duration)),
          completed: false,
          position: i
        })
        .select()
        .single()
      
      if (!subtaskError && subtask) {
        subtasks.push(subtask)
      }
    }
    
    return NextResponse.json({
      success: true,
      task,
      subtasks,
      message: `✨ Zadanie podzielone na ${subtasks.length} kroków`
    })
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/decompose:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
