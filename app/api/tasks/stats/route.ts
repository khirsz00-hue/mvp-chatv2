/**
 * Task Stats API
 * Returns statistics about tasks for a given date
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTasks, getOrCreateDayAssistantV2 } from '@/lib/services/dayAssistantV2Service'

export const dynamic = 'force-dynamic'

/**
 * Helper function to create authenticated Supabase client from request
 */
function createAuthenticatedClient(request: NextRequest) {
  return createClient(
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
}

/**
 * GET /api/tasks/stats - Get task statistics
 * Query params:
 * - date: Date string (YYYY-MM-DD) to get stats for (default: today)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json(
        { error: 'Failed to get assistant' },
        { status: 500 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    console.log('[TaskStatsAPI] GET stats for date:', date)

    // Fetch tasks for the date
    const tasks = await getTasks(user.id, assistant.id, {
      date: date,
      includeCompleted: true,
      includeAllDates: false
    })

    // Calculate statistics
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      pending: tasks.filter(t => !t.completed).length,
      bySource: {
        local: tasks.filter(t => t.source === 'local').length,
        todoist: tasks.filter(t => t.source === 'todoist').length,
        asana: tasks.filter(t => t.source === 'asana').length
      },
      highPriority: tasks.filter(t => t.priority === 1 && !t.completed).length,
      mustTasks: tasks.filter(t => t.is_must && !t.completed).length
    }

    console.log('[TaskStatsAPI] ✅ Stats:', stats)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('[TaskStatsAPI] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get task stats' },
      { status: 500 }
    )
  }
}
