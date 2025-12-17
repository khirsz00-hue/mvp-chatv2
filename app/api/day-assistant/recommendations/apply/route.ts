import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { pinTaskToday, postponeTask, escalateTask } from '@/lib/services/dayAssistantService'
import { format, addMinutes } from 'date-fns'

export const dynamic = 'force-dynamic'

interface RecommendationAction {
  op: string
  taskId?: string
  taskIds?: string[]
  priority?: 'now' | 'next' | 'later'
  start?: string
  durationMin?: number
  energyMode?: 'crisis' | 'normal' | 'flow'
  [key: string]: any
}

interface ApplyRecommendationRequest {
  recommendation: {
    id: string
    type: string
    actions: RecommendationAction[]
    taskDetails?: Array<{
      taskId: string
      title: string
    }>
  }
}

/**
 * POST /api/day-assistant/recommendations/apply
 * 
 * Apply a chat recommendation to tasks
 * Handles various action types: move tasks, create blocks, change energy mode, etc.
 * Uses authenticated user context via RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user?.id) {
      console.error('[Recommendations Apply] No authenticated user - session missing')
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const userId = user.id
    const body: ApplyRecommendationRequest = await request.json()
    const { recommendation } = body

    console.log('🔍 [API Recommendations Apply] User:', userId, 'Type:', recommendation.type)

    if (!recommendation || !recommendation.actions || recommendation.actions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid recommendation: missing actions' },
        { status: 400 }
      )
    }

    const results = []
    let energyModeChanged = false

    // Process each action in the recommendation
    for (const action of recommendation.actions) {
      try {
        switch (action.op) {
          case 'MOVE_TASK': {
            // Move task to a different priority
            const taskId = action.taskId
            const priority = action.priority
            
            if (!taskId || !priority) {
              console.warn('MOVE_TASK action missing taskId or priority')
              continue
            }

            // Update task priority
            const { data, error } = await supabase
              .from('day_assistant_tasks')
              .update({ priority })
              .eq('id', taskId)
              .eq('user_id', userId)
              .select()
              .single()

            if (error) {
              console.error('Error moving task:', error)
              results.push({ action: 'MOVE_TASK', success: false, error: error.message })
            } else {
              console.log(`✅ Moved task ${taskId} to ${priority}`)
              results.push({ action: 'MOVE_TASK', success: true, taskId })
            }
            break
          }

          case 'PIN_TASK': {
            // Pin task (mega important)
            const taskId = action.taskId
            if (!taskId) continue

            const result = await pinTaskToday(userId, taskId)
            if (result) {
              console.log(`✅ Pinned task ${taskId}`)
              results.push({ action: 'PIN_TASK', success: true, taskId })
            } else {
              results.push({ action: 'PIN_TASK', success: false, taskId })
            }
            break
          }

          case 'ESCALATE_TASK': {
            // Escalate task (move to NOW/NEXT)
            const taskId = action.taskId
            if (!taskId) continue

            const result = await escalateTask(userId, taskId)
            if (result) {
              console.log(`✅ Escalated task ${taskId}`)
              results.push({ action: 'ESCALATE_TASK', success: true, taskId })
            } else {
              results.push({ action: 'ESCALATE_TASK', success: false, taskId })
            }
            break
          }

          case 'POSTPONE_TASK': {
            // Postpone task (move to LATER)
            const taskId = action.taskId
            if (!taskId) continue

            const result = await postponeTask(userId, taskId)
            if (result) {
              console.log(`✅ Postponed task ${taskId}`)
              results.push({ action: 'POSTPONE_TASK', success: true, taskId })
            } else {
              results.push({ action: 'POSTPONE_TASK', success: false, taskId })
            }
            break
          }

          case 'CREATE_BLOCK': {
            // Create a time block for grouping tasks
            const { start, durationMin, taskIds } = action
            
            if (!start || !durationMin || !taskIds) {
              console.warn('CREATE_BLOCK action missing required fields')
              continue
            }

            const today = format(new Date(), 'yyyy-MM-dd')
            const [hours, minutes] = start.split(':').map(Number)
            const startDate = new Date()
            startDate.setHours(hours, minutes, 0, 0)
            const endDate = addMinutes(startDate, durationMin)
            const endTime = format(endDate, 'HH:mm')

            // Get task titles for block title
            const { data: tasks } = await supabase
              .from('day_assistant_tasks')
              .select('title')
              .in('id', taskIds)
              .eq('user_id', userId)

            const blockTitle = tasks && tasks.length > 0
              ? `Blok: ${tasks.map(t => t.title).join(', ')}`
              : 'Blok zadań'

            // Create timeline event
            const { data, error } = await supabase
              .from('day_timeline_events')
              .insert({
                user_id: userId,
                date: today,
                type: 'task-block',
                title: blockTitle,
                start_time: start,
                end_time: endTime,
                duration_minutes: durationMin,
                task_ids: taskIds,
                metadata: { recommendation_id: recommendation.id }
              })
              .select()
              .single()

            if (error) {
              console.error('Error creating block:', error)
              results.push({ action: 'CREATE_BLOCK', success: false, error: error.message })
            } else {
              console.log(`✅ Created time block at ${start}`)
              results.push({ action: 'CREATE_BLOCK', success: true, blockId: data.id })
            }
            break
          }

          case 'CHANGE_ENERGY_MODE': {
            // Change user's energy mode
            const mode = action.energyMode
            
            if (!mode || !['crisis', 'normal', 'flow'].includes(mode)) {
              console.warn('CHANGE_ENERGY_MODE action missing or invalid energyMode')
              continue
            }

            const { error } = await supabase
              .from('day_assistant_energy_state')
              .upsert({
                user_id: userId,
                current_mode: mode,
                last_changed: new Date().toISOString()
              })

            if (error) {
              console.error('Error changing energy mode:', error)
              results.push({ action: 'CHANGE_ENERGY_MODE', success: false, error: error.message })
            } else {
              console.log(`✅ Changed energy mode to ${mode}`)
              energyModeChanged = true
              results.push({ action: 'CHANGE_ENERGY_MODE', success: true, mode })
            }
            break
          }

          case 'MARK_MEGA_IMPORTANT': {
            // Mark task as mega important
            const taskId = action.taskId
            if (!taskId) continue

            const { error } = await supabase
              .from('day_assistant_tasks')
              .update({ is_mega_important: true })
              .eq('id', taskId)
              .eq('user_id', userId)

            if (error) {
              console.error('Error marking task as mega important:', error)
              results.push({ action: 'MARK_MEGA_IMPORTANT', success: false, error: error.message })
            } else {
              console.log(`✅ Marked task ${taskId} as mega important`)
              results.push({ action: 'MARK_MEGA_IMPORTANT', success: true, taskId })
            }
            break
          }

          default:
            console.warn(`Unknown action operation: ${action.op}`)
            results.push({ action: action.op, success: false, error: 'Unknown operation' })
        }
      } catch (actionError: any) {
        console.error(`Error processing action ${action.op}:`, actionError)
        results.push({ action: action.op, success: false, error: actionError.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    console.log(`✅ [API Recommendations Apply] Applied ${successCount}/${totalCount} actions`)

    return NextResponse.json({
      success: successCount > 0,
      results,
      energyModeChanged,
      message: `Zastosowano ${successCount} z ${totalCount} akcji`
    })
  } catch (error: any) {
    console.error('Error in recommendations apply route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
