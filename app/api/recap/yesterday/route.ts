import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/recap/yesterday
 * Returns completed tasks from yesterday with statistics
 * Uses day_assistant_v2_tasks table with completed_at filtering
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token } = body

    console.log('🔍 [Recap/Yesterday] Starting request')

    // Create authenticated Supabase client
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      console.error('❌ [Recap/Yesterday] User not authenticated')
      return NextResponse.json({ 
        error: 'Unauthorized',
        tasks: [],
        stats: { completed: 0, total: 0 }
      }, { status: 401 })
    }

    // Get yesterday's date range with timezone
    const yesterday = subDays(new Date(), 1)
    const yesterdayDate = format(yesterday, 'yyyy-MM-dd')
    const yesterdayStart = new Date(yesterday)
    yesterdayStart.setHours(0, 0, 0, 0)
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)

    console.log('🔍 [Recap/Yesterday] Fetching completed tasks for date:', yesterdayDate)
    console.log('🔍 [Recap/Yesterday] Time range:', yesterdayStart.toISOString(), 'to', yesterdayEnd.toISOString())

    // Fetch completed tasks from day_assistant_v2_tasks with completed_at filtering
    const { data: completedTasks, error: dbError } = await supabase
      .from('day_assistant_v2_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('completed_at', yesterdayStart.toISOString())
      .lte('completed_at', yesterdayEnd.toISOString())
      .order('completed_at', { ascending: false })

    if (dbError) {
      console.error('❌ [Recap/Yesterday] Database error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to fetch tasks from database',
        tasks: [],
        stats: { completed: 0, total: 0 }
      }, { status: 500 })
    }

    const tasks = completedTasks || []

    // Fallback: If no tasks in database, try fetching from Todoist as backup
    if (tasks.length === 0 && token) {
      console.log('⚠️ [Recap/Yesterday] No tasks in database, trying Todoist API as fallback')
      try {
        const baseUrl = req.url.split('/api/')[0]
        const response = await fetch(`${baseUrl}/api/todoist/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            filter: 'completed',
            date: yesterdayDate
          })
        })

        if (response.ok) {
          const data = await response.json()
          const todoistTasks = data.tasks || []
          
          if (todoistTasks.length > 0) {
            console.log('✅ [Recap/Yesterday] Found', todoistTasks.length, 'completed tasks from Todoist fallback')
            
            // Find the last active task (most recently completed)
            const lastActiveTask = todoistTasks[todoistTasks.length - 1]
            
            return NextResponse.json({
              tasks: todoistTasks,
              lastActiveTask,
              stats: {
                completed: todoistTasks.length,
                total: todoistTasks.length
              }
            })
          }
        }
      } catch (fallbackError) {
        console.warn('⚠️ [Recap/Yesterday] Todoist fallback failed:', fallbackError)
      }
    }

    // Map tasks to expected format
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      content: task.title,
      description: task.description,
      priority: task.priority || 4,
      due: task.due_date ? { date: task.due_date } : null,
      completed: true,
      completed_at: task.completed_at,
      cognitive_load: task.cognitive_load,
      context_type: task.context_type
    }))

    // Find the last active task (most recently completed)
    const lastActiveTask = formattedTasks.length > 0 
      ? formattedTasks[0] // Already sorted by completed_at desc
      : null

    console.log('✅ [Recap/Yesterday] Found', formattedTasks.length, 'completed tasks from database')

    return NextResponse.json({
      tasks: formattedTasks,
      lastActiveTask,
      stats: {
        completed: formattedTasks.length,
        total: formattedTasks.length
      }
    })
  } catch (error) {
    console.error('❌ [Recap/Yesterday] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      tasks: [],
      stats: { completed: 0, total: 0 }
    }, { status: 500 })
  }
}
