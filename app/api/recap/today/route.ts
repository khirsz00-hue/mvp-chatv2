import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { calculateTaskScore } from '@/lib/services/advancedTaskScoring'

export const dynamic = 'force-dynamic'

interface Task {
  id: string
  content: string
  priority: number
  due?: { date?: string; datetime?: string } | null
  completed?: boolean
  cognitive_load?: number
  postpone_count?: number
  context_type?: string
  score?: number
}

/**
 * POST /api/recap/today
 * Returns tasks scheduled for today with focus task suggestion using advanced scoring
 * Uses day_assistant_v2_tasks with intelligent scoring system
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token } = body

    console.log('🔍 [Recap/Today] Starting request')

    // Create authenticated Supabase client
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      console.error('❌ [Recap/Today] User not authenticated')
      return NextResponse.json({ 
        error: 'Unauthorized',
        tasks: [],
        focusTask: null,
        stats: { total: 0, highPriority: 0 }
      }, { status: 401 })
    }

    const todayDate = format(new Date(), 'yyyy-MM-dd')
    console.log('🔍 [Recap/Today] Fetching tasks for date:', todayDate)

    // Fetch today's tasks from day_assistant_v2_tasks
    const { data: todayTasks, error: dbError } = await supabase
      .from('day_assistant_v2_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .eq('due_date', todayDate)
      .order('position', { ascending: true })

    if (dbError) {
      console.error('❌ [Recap/Today] Database error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to fetch tasks from database',
        tasks: [],
        focusTask: null,
        stats: { total: 0, highPriority: 0 }
      }, { status: 500 })
    }

    const tasks = todayTasks || []

    // Fallback: If no tasks in database, try fetching from Todoist as backup
    if (tasks.length === 0 && token) {
      console.log('⚠️ [Recap/Today] No tasks in database, trying Todoist API as fallback')
      try {
        const baseUrl = req.url.split('/api/')[0]
        const response = await fetch(`${baseUrl}/api/todoist/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            filter: 'today',
            date: todayDate
          })
        })

        if (response.ok) {
          const data = await response.json()
          const todoistTasks = data.tasks || []
          
          if (todoistTasks.length > 0) {
            console.log('✅ [Recap/Today] Found', todoistTasks.length, 'tasks from Todoist fallback')
            
            // Simple sort for fallback
            const sortedTasks = [...todoistTasks].sort((a, b) => a.priority - b.priority)
            const focusTask = sortedTasks[0]
            const highPriorityCount = todoistTasks.filter((t: Task) => t.priority <= 2).length
            
            return NextResponse.json({
              tasks: sortedTasks,
              focusTask,
              stats: {
                total: todoistTasks.length,
                highPriority: highPriorityCount
              }
            })
          }
        }
      } catch (fallbackError) {
        console.warn('⚠️ [Recap/Today] Todoist fallback failed:', fallbackError)
      }
    }

    // Calculate advanced scores for each task
    const tasksWithScores = tasks.map(task => {
      const scoreResult = calculateTaskScore({
        due_date: task.due_date,
        priority: task.priority,
        cognitive_load: task.cognitive_load || 3,
        postpone_count: task.postpone_count || 0
      } as any)

      return {
        id: task.id,
        content: task.title,
        description: task.description,
        priority: task.priority || 4,
        due: task.due_date ? { date: task.due_date } : null,
        completed: false,
        cognitive_load: task.cognitive_load,
        postpone_count: task.postpone_count,
        context_type: task.context_type,
        score: scoreResult.total,
        scoreBreakdown: scoreResult.breakdown
      }
    })

    // Sort by score (highest first) - this is our intelligent prioritization
    const sortedTasks = tasksWithScores.sort((a, b) => b.score! - a.score!)

    // Focus task: task with highest score
    const focusTask = sortedTasks.length > 0 ? sortedTasks[0] : null

    const highPriorityCount = tasks.filter((t: any) => t.priority <= 2).length

    console.log('✅ [Recap/Today] Found', tasks.length, 'tasks,', highPriorityCount, 'high priority')
    if (focusTask) {
      console.log('🎯 [Recap/Today] Focus task:', focusTask.content, 'with score:', focusTask.score)
    }

    return NextResponse.json({
      tasks: sortedTasks,
      focusTask,
      stats: {
        total: tasks.length,
        highPriority: highPriorityCount
      }
    })
  } catch (error) {
    console.error('❌ [Recap/Today] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      tasks: [],
      focusTask: null,
      stats: { total: 0, highPriority: 0 }
    }, { status: 500 })
  }
}
