import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * GET /api/recap/yesterday
 * Returns completed tasks from yesterday with statistics
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ 
        error: 'No Todoist token provided',
        tasks: [],
        stats: { completed: 0, total: 0 }
      }, { status: 400 })
    }

    // Get yesterday's date range
    const yesterday = subDays(new Date(), 1)
    const yesterdayDate = yesterday.toISOString().split('T')[0]

    console.log('🔍 [Recap/Yesterday] Fetching tasks for date:', yesterdayDate)

    // Fetch completed tasks from yesterday using POST method
    const baseUrl = req.url.split('/api/')[0] // Get the base URL from request
    const response = await fetch(`${baseUrl}/api/todoist/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        filter: 'completed',
        date: yesterdayDate
      })
    })

    if (!response.ok) {
      console.error('❌ [Recap/Yesterday] Failed to fetch tasks:', response.status)
      return NextResponse.json({ 
        error: 'Failed to fetch tasks',
        tasks: [],
        stats: { completed: 0, total: 0 }
      }, { status: response.status })
    }

    const data = await response.json()
    const completedTasks = data.tasks || []

    // Find the last active task (most recently completed)
    const lastActiveTask = completedTasks.length > 0 
      ? completedTasks[completedTasks.length - 1]
      : null

    console.log('✅ [Recap/Yesterday] Found', completedTasks.length, 'completed tasks')

    return NextResponse.json({
      tasks: completedTasks,
      lastActiveTask,
      stats: {
        completed: completedTasks.length,
        total: completedTasks.length // For yesterday, we only have completed tasks
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
