/**
 * API Route: /api/day-assistant-v2/pin
 * POST: Toggle task pin/unpin (is_must)
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
    const { task_id, pin } = body
    
    if (!task_id || typeof pin !== 'boolean') {
      return NextResponse.json({ error: 'task_id and pin (boolean) are required' }, { status: 400 })
    }
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // If pinning, check current count
    if (pin) {
      const { data: mustTasks } = await supabase
        .from('day_assistant_v2_tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('assistant_id', assistant.id)
        .eq('is_must', true)
        .eq('completed', false)
      
      if (mustTasks && mustTasks.length >= 3) {
        return NextResponse.json(
          { error: 'Maksymalnie 3 zadania MUST! Odepnij coś najpierw.' },
          { status: 400 }
        )
      }
    }
    
    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from('day_assistant_v2_tasks')
      .update({ is_must: pin })
      .eq('id', task_id)
      .select()
      .single()
    
    if (updateError) {
      console.error('[day-assistant-v2/pin] Error updating task:', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: pin ? '📌 Zadanie przypięte' : '📌 Zadanie odpięte'
    })
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/pin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
