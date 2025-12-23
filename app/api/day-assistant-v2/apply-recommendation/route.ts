/**
 * API Route: /api/day-assistant-v2/apply-recommendation
 * POST: Apply a recommendation by executing its actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Recommendation, RecommendationAction } from '@/lib/types/dayAssistantV2'
import { getOrCreateDayAssistantV2 } from '@/lib/services/dayAssistantV2Service'

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

    // 🔍 Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Apply Recommendation] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recommendation, date } = body as { recommendation: Recommendation; date: string }

    if (!recommendation || !date) {
      return NextResponse.json({ error: 'recommendation and date are required' }, { status: 400 })
    }

    console.log('🔍 [Apply Recommendation] User:', user.id)
    console.log('🔍 [Apply Recommendation] Type:', recommendation.type)
    console.log('🔍 [Apply Recommendation] Actions:', recommendation.actions.length)

    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }

    const results: { action: string; success: boolean; error?: string }[] = []

    // Execute each action
    for (const action of recommendation.actions) {
      try {
        const result = await executeAction(supabase, user.id, assistant.id, action, date)
        results.push({ action: action.op, success: result.success, error: result.error })
      } catch (error) {
        console.error('❌ [Apply Recommendation] Action failed:', action.op, error)
        results.push({ 
          action: action.op, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Log decision to decision_log
    await supabase.from('day_assistant_v2_decision_log').insert({
      user_id: user.id,
      assistant_id: assistant.id,
      action: 'apply_recommendation',
      reason: recommendation.title,
      context: {
        recommendation_type: recommendation.type,
        actions: recommendation.actions.map(a => a.op),
        confidence: recommendation.confidence
      },
      timestamp: new Date().toISOString()
    })

    // Check if all actions succeeded
    const allSucceeded = results.every(r => r.success)
    const someSucceeded = results.some(r => r.success)

    if (allSucceeded || someSucceeded) {
      // ✅ PERSIST applied recommendation to database
      // This prevents the recommendation from appearing again after background sync
      const { error: persistError } = await supabase
        .from('day_assistant_v2_applied_recommendations')
        .upsert({
          user_id: user.id,
          assistant_id: assistant.id,
          recommendation_id: recommendation.id,
          recommendation_type: recommendation.type,
          applied_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,recommendation_id'
        })

      if (persistError) {
        console.error(`❌ [Apply Recommendation] Failed to persist recommendation ${recommendation.id} (${recommendation.type}) to database:`, persistError)
        // Don't fail the entire request - recommendation was still applied locally
      } else {
        console.log(`✅ [Apply Recommendation] Persisted to database: ${recommendation.id} (${recommendation.type})`)
      }
    }

    if (allSucceeded) {
      console.log('✅ [Apply Recommendation] All actions succeeded')
      return NextResponse.json({
        success: true,
        message: 'Rekomendacja zastosowana pomyślnie',
        results
      })
    } else if (someSucceeded) {
      console.log('⚠️ [Apply Recommendation] Partial success')
      return NextResponse.json({
        success: true,
        message: 'Rekomendacja częściowo zastosowana',
        results
      })
    } else {
      console.log('❌ [Apply Recommendation] All actions failed')
      return NextResponse.json({
        success: false,
        error: 'Nie udało się zastosować rekomendacji',
        results
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ [Apply Recommendation] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Execute a single recommendation action
 */
async function executeAction(
  supabase: any,
  userId: string,
  assistantId: string,
  action: RecommendationAction,
  date: string
): Promise<{ success: boolean; error?: string }> {
  console.log('🔍 [Execute Action]', action.op)

  switch (action.op) {
    case 'REORDER_TASKS': {
      // Reorder tasks by updating their positions
      if (!action.taskIds || action.taskIds.length === 0) {
        return { success: false, error: 'No task IDs provided' }
      }

      // Update positions for each task (bring to front)
      for (let i = 0; i < action.taskIds.length; i++) {
        const taskId = action.taskIds[i]
        const newPosition = i + 1 // Start from position 1

        const { error } = await supabase
          .from('day_assistant_v2_tasks')
          .update({ position: newPosition, updated_at: new Date().toISOString() })
          .eq('id', taskId)
          .eq('user_id', userId)

        if (error) {
          console.error('❌ [Reorder Tasks] Error updating task:', taskId, error)
          return { success: false, error: `Failed to reorder task ${taskId}` }
        }
      }

      console.log('✅ [Reorder Tasks] Reordered', action.taskIds.length, 'tasks')
      return { success: true }
    }

    case 'GROUP_SIMILAR': {
      // Group similar tasks together (same as REORDER_TASKS)
      if (!action.taskIds || action.taskIds.length === 0) {
        return { success: false, error: 'No task IDs provided' }
      }

      for (let i = 0; i < action.taskIds.length; i++) {
        const taskId = action.taskIds[i]
        const newPosition = i + 1

        const { error } = await supabase
          .from('day_assistant_v2_tasks')
          .update({ position: newPosition, updated_at: new Date().toISOString() })
          .eq('id', taskId)
          .eq('user_id', userId)

        if (error) {
          console.error('❌ [Group Similar] Error updating task:', taskId, error)
          return { success: false, error: `Failed to group task ${taskId}` }
        }
      }

      console.log('✅ [Group Similar] Grouped', action.taskIds.length, 'tasks')
      return { success: true }
    }

    case 'ADD_BREAK': {
      // This is a client-side action - we just return success
      // The actual break timer will be started by the client
      console.log('✅ [Add Break] Break action acknowledged (duration:', action.durationMinutes, 'min)')
      return { success: true }
    }

    case 'DEFER_TASK': {
      // Move task to later position or different date
      if (!action.taskId) {
        return { success: false, error: 'No task ID provided' }
      }

      const { error } = await supabase
        .from('day_assistant_v2_tasks')
        .update({ 
          position: 9999, // Move to end of queue
          updated_at: new Date().toISOString() 
        })
        .eq('id', action.taskId)
        .eq('user_id', userId)

      if (error) {
        console.error('❌ [Defer Task] Error:', error)
        return { success: false, error: 'Failed to defer task' }
      }

      console.log('✅ [Defer Task] Deferred task:', action.taskId)
      return { success: true }
    }

    case 'CHANGE_MUST': {
      // Change MUST status of a task
      if (!action.taskId) {
        return { success: false, error: 'No task ID provided' }
      }

      const { error } = await supabase
        .from('day_assistant_v2_tasks')
        .update({ 
          is_must: action.pin ?? false,
          updated_at: new Date().toISOString()
        })
        .eq('id', action.taskId)
        .eq('user_id', userId)

      if (error) {
        console.error('❌ [Change Must] Error:', error)
        return { success: false, error: 'Failed to change MUST status' }
      }

      console.log('✅ [Change Must] Changed MUST status for task:', action.taskId)
      return { success: true }
    }

    default:
      console.log('⚠️ [Execute Action] Unknown action type:', action.op)
      return { success: false, error: `Unknown action type: ${action.op}` }
  }
}
