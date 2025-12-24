/**
 * API Route: /api/voice/save-tasks
 * POST: Batch save tasks from voice ramble to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseAuth'
import { getOrCreateDayAssistantV2 } from '@/lib/services/dayAssistantV2Service'

export const dynamic = 'force-dynamic'

interface ParsedTask {
  title: string
  due_date: string | null
  estimate_min: number
  context_type: string
}

interface SaveTasksRequest {
  tasks: ParsedTask[]
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Save Tasks API] Request received')

    const supabase = await createAuthenticatedSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ [Save Tasks API] Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: SaveTasksRequest = await request.json()
    const { tasks } = body

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks provided' },
        { status: 400 }
      )
    }

    console.log('🔍 [Save Tasks API] Saving', tasks.length, 'tasks for user:', user.id)

    // Get or create assistant
    const assistant = await getOrCreateDayAssistantV2(user.id, supabase)
    if (!assistant) {
      console.error('❌ [Save Tasks API] Failed to get assistant')
      return NextResponse.json(
        { error: 'Failed to get assistant' },
        { status: 500 }
      )
    }

    // Prepare tasks for insertion
    const today = new Date().toISOString().split('T')[0]
    const tasksToInsert = tasks.map(task => ({
      user_id: user.id,
      assistant_id: assistant.id,
      title: task.title,
      due_date: task.due_date || today,
      context_type: task.context_type || 'deep_work',
      estimate_min: task.estimate_min || 30,
      cognitive_load: 2, // Default
      priority: 3, // Default
      source: 'voice_ramble',
      status: 'active'
    }))

    // Batch insert
    const { data: insertedTasks, error: insertError } = await supabase
      .from('day_assistant_v2_tasks')
      .insert(tasksToInsert)
      .select()

    if (insertError) {
      console.error('❌ [Save Tasks API] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save tasks', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('✅ [Save Tasks API] Saved', insertedTasks.length, 'tasks')

    return NextResponse.json({
      success: true,
      saved: insertedTasks.length,
      tasks: insertedTasks
    })
  } catch (error: any) {
    console.error('❌ [Save Tasks API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save tasks', details: error.message },
      { status: 500 }
    )
  }
}
