import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * GET /api/recap/today
 * Returns tasks scheduled for today with focus task suggestion
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ 
        error: 'No Todoist token provided',
        tasks: [],
        focusTask: null,
        stats: { total: 0, highPriority: 0 }
      }, { status: 400 })
    }

    const todayDate = format(new Date(), 'yyyy-MM-dd')
    console.log('🔍 [Recap/Today] Fetching tasks for date:', todayDate)

    // Fetch today's tasks
    const response = await fetch('/api/todoist/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        filter: 'today',
        date: todayDate
      })
    })

    if (!response.ok) {
      console.error('❌ [Recap/Today] Failed to fetch tasks:', response.status)
      return NextResponse.json({ 
        error: 'Failed to fetch tasks',
        tasks: [],
        focusTask: null,
        stats: { total: 0, highPriority: 0 }
      }, { status: response.status })
    }

    const data = await response.json()
    const todayTasks = data.tasks || []

    // Sort tasks by priority (1 = highest priority in Todoist)
    const sortedTasks = [...todayTasks].sort((a, b) => {
      // Priority 1 is highest, 4 is lowest
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // Secondary sort by due time if available
      if (a.due?.datetime && b.due?.datetime) {
        return new Date(a.due.datetime).getTime() - new Date(b.due.datetime).getTime()
      }
      return 0
    })

    // Focus task: highest priority task that's not completed
    const focusTask = sortedTasks.find(t => !t.completed) || null

    const highPriorityCount = todayTasks.filter(t => t.priority <= 2).length

    console.log('✅ [Recap/Today] Found', todayTasks.length, 'tasks,', highPriorityCount, 'high priority')

    return NextResponse.json({
      tasks: sortedTasks,
      focusTask,
      stats: {
        total: todayTasks.length,
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
