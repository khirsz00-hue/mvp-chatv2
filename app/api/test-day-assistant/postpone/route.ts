/**
 * API Route: /api/test-day-assistant/postpone
 * POST: Postpone task to next day ("Nie dziś" button)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateTestDayAssistant,
  postponeTask
} from '@/lib/services/testDayAssistantService'
import { generatePostponeRecommendation } from '@/lib/services/testDayRecommendationEngine'

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
    const { task_id, reason, reserve_morning } = body
    
    if (!task_id) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
    }
    
    // Get assistant
    const assistant = await getOrCreateTestDayAssistant(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Postpone task
    const result = await postponeTask(
      user.id,
      assistant.id,
      task_id,
      reason,
      reserve_morning
    )
    
    if (!result.success || !result.task) {
      return NextResponse.json({ error: 'Failed to postpone task' }, { status: 500 })
    }
    
    // Generate escalation recommendation if needed
    let proposal = null
    if (result.task.due_date) {
      proposal = await generatePostponeRecommendation(
        user.id,
        assistant.id,
        assistant,
        result.task,
        result.task.due_date
      )
    }
    
    return NextResponse.json({
      success: true,
      task: result.task,
      decision_log_id: result.decision_log_id,
      undo_window_expires: result.undo_window_expires,
      proposal,
      message: '🧊 Zadanie przeniesione na jutro'
    })
  } catch (error) {
    console.error('Error in POST /api/test-day-assistant/postpone:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
