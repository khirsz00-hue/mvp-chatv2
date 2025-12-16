import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { pinTaskToday, postponeTask, escalateTask } from '@/lib/services/dayAssistantService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/day-assistant/actions
 * 
 * Perform task actions (pin, postpone, escalate)
 * Uses authenticated user context via RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { taskId, action } = body

    console.log('🔍 [API Actions] User:', user.id, 'taskId:', taskId, 'action:', action)

    if (!taskId || !action) {
      return NextResponse.json(
        { error: 'taskId and action are required' },
        { status: 400 }
      )
    }

    let updatedTask = null

    switch (action) {
      case 'pin':
        updatedTask = await pinTaskToday(user.id, taskId)
        break
      case 'postpone':
        updatedTask = await postponeTask(user.id, taskId)
        break
      case 'escalate':
        updatedTask = await escalateTask(user.id, taskId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    if (!updatedTask) {
      console.error('❌ [API Actions] Failed to perform action')
      return NextResponse.json(
        { error: 'Failed to perform action' },
        { status: 500 }
      )
    }

    console.log(`✅ [API Actions] Action '${action}' completed successfully`)
    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('Error in actions route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
