/**
 * Recap Service Layer
 * 
 * Business logic for recap/morning brief functionality.
 * Extracted from API routes to enable direct function calls without HTTP overhead.
 * 
 * This fixes the 401 Unauthorized bug where server-to-server fetch() calls
 * on Vercel don't pass cookies to other API routes.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { format, subDays } from 'date-fns'
import { calculateTaskScore } from '@/lib/services/advancedTaskScoring'
import type { TestDayTask } from '@/lib/types/dayAssistantV2'

/**
 * Get a human-readable explanation for why a task is the focus task
 * Based on the score breakdown
 */
function getFocusReason(breakdown: any): string {
  if (!breakdown) return 'Najlepiej dopasowane do Twojego harmonogramu'
  
  const { deadline, priority, postpone } = breakdown
  
  // Check each factor in order of importance
  if (deadline >= 100) {
    return 'Overdue lub najbliższy deadline'
  } else if (deadline >= 60) {
    return 'Deadline dzisiaj'
  } else if (priority >= 30) {
    return 'Najwyższy priorytet (P1 lub P2)'
  } else if (postpone >= 15) {
    return 'Często przekładane - czas to zrobić'
  } else if (deadline >= 30) {
    return 'Deadline jutro'
  } else {
    return 'Najlepiej dopasowane do Twojej energii'
  }
}

/**
 * Get completed tasks from yesterday
 * Extracted from /api/recap/yesterday for reuse without HTTP overhead
 * 
 * @param supabase - Authenticated Supabase client with user session
 * @param userId - User ID for database queries
 * @param todoistToken - Optional Todoist token for fallback API calls
 * @returns Object with tasks, lastActiveTask, and stats
 */
export async function getYesterdayTasks(
  supabase: SupabaseClient,
  userId: string,
  todoistToken?: string | null
) {
  // Get yesterday's date range with timezone
  const yesterday = subDays(new Date(), 1)
  const yesterdayDate = format(yesterday, 'yyyy-MM-dd')
  const yesterdayStart = new Date(yesterday)
  yesterdayStart.setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(23, 59, 59, 999)

  console.log('🔍 [RecapService/Yesterday] Fetching completed tasks for date:', yesterdayDate)

  // Fetch completed tasks from day_assistant_v2_tasks with completed_at filtering
  const { data: completedTasks, error: dbError } = await supabase
    .from('day_assistant_v2_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', yesterdayStart.toISOString())
    .lte('completed_at', yesterdayEnd.toISOString())
    .order('completed_at', { ascending: false })

  if (dbError) {
    console.error('❌ [RecapService/Yesterday] Database error:', dbError)
    throw new Error('Database error: ' + dbError.message)
  }

  const tasks = completedTasks || []

  // Fallback: If no tasks in database, try fetching from Todoist as backup
  if (tasks.length === 0 && todoistToken) {
    console.log('⚠️ [RecapService/Yesterday] No tasks in database, trying Todoist API as fallback')
    
    try {
      // We need to make an HTTP call for Todoist API since it's external
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/todoist/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: todoistToken, 
          filter: 'completed',
          date: yesterdayDate
        })
      })

      if (response.ok) {
        const data = await response.json()
        const todoistTasks = data.tasks || []
        
        if (todoistTasks.length > 0) {
          console.log('✅ [RecapService/Yesterday] Found', todoistTasks.length, 'completed tasks from Todoist fallback')
          
          // Find the last active task (most recently completed)
          const lastActiveTask = todoistTasks[todoistTasks.length - 1]
          
          return {
            tasks: todoistTasks,
            lastActiveTask,
            stats: {
              completed: todoistTasks.length,
              total: todoistTasks.length
            }
          }
        }
      } else if (response.status === 401) {
        console.error('❌ [RecapService/Yesterday] Todoist token expired')
        throw new Error('Token expired')
      }
    } catch (fallbackError) {
      console.warn('⚠️ [RecapService/Yesterday] Todoist fallback failed:', fallbackError)
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

  console.log('✅ [RecapService/Yesterday] Found', formattedTasks.length, 'completed tasks from database')

  return {
    tasks: formattedTasks,
    lastActiveTask,
    stats: {
      completed: formattedTasks.length,
      total: formattedTasks.length
    }
  }
}

/**
 * Get today's tasks with intelligent scoring
 * Extracted from /api/recap/today for reuse without HTTP overhead
 * 
 * @param supabase - Authenticated Supabase client with user session
 * @param userId - User ID for database queries
 * @param todoistToken - Optional Todoist token for fallback API calls
 * @returns Object with tasks, focusTask, focusReason, and stats
 */
export async function getTodayTasks(
  supabase: SupabaseClient,
  userId: string,
  todoistToken?: string | null
) {
  const todayDate = format(new Date(), 'yyyy-MM-dd')
  console.log('🔍 [RecapService/Today] Fetching tasks for date:', todayDate)

  // Fetch today's tasks from day_assistant_v2_tasks
  const { data: todayTasks, error: dbError } = await supabase
    .from('day_assistant_v2_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .eq('due_date', todayDate)
    .order('position', { ascending: true })

  if (dbError) {
    console.error('❌ [RecapService/Today] Database error:', dbError)
    throw new Error('Database error: ' + dbError.message)
  }

  const tasks = todayTasks || []

  // Fallback: If no tasks in database, try fetching from Todoist as backup
  if (tasks.length === 0 && todoistToken) {
    console.log('⚠️ [RecapService/Today] No tasks in database, trying Todoist API as fallback')
    
    try {
      // We need to make an HTTP call for Todoist API since it's external
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/todoist/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: todoistToken, 
          filter: 'today',
          date: todayDate
        })
      })

      if (response.ok) {
        const data = await response.json()
        const todoistTasks = data.tasks || []
        
        if (todoistTasks.length > 0) {
          console.log('✅ [RecapService/Today] Found', todoistTasks.length, 'tasks from Todoist fallback')
          
          // Simple sort for fallback
          const sortedTasks = [...todoistTasks].sort((a: any, b: any) => a.priority - b.priority)
          const focusTask = sortedTasks[0]
          const highPriorityCount = todoistTasks.filter((t: any) => t.priority <= 2).length
          
          return {
            tasks: sortedTasks,
            focusTask,
            focusReason: null,
            stats: {
              total: todoistTasks.length,
              highPriority: highPriorityCount
            }
          }
        }
      } else if (response.status === 401) {
        console.error('❌ [RecapService/Today] Todoist token expired')
        throw new Error('Token expired')
      }
    } catch (fallbackError) {
      console.warn('⚠️ [RecapService/Today] Todoist fallback failed:', fallbackError)
    }
  }

  // Calculate advanced scores for each task
  const tasksWithScores = tasks.map(task => {
    // Map database task to scoring format with all required fields
    const taskForScoring: TestDayTask = {
      id: task.id,
      user_id: userId,
      assistant_id: '',
      title: task.title,
      description: task.description || null,
      due_date: task.due_date || null,
      priority: task.priority || 4,
      cognitive_load: task.cognitive_load || 3,
      postpone_count: task.postpone_count || 0,
      completed: false,
      is_must: false,
      is_important: (task.priority || 4) <= 2,
      estimate_min: 30,
      tags: [],
      context_type: task.context_type || null,
      position: 0,
      auto_moved: false,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const scoreResult = calculateTaskScore(taskForScoring)

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
  const focusReason = focusTask ? getFocusReason(focusTask.scoreBreakdown) : null

  const highPriorityCount = tasks.filter((t: any) => t.priority <= 2).length

  console.log('✅ [RecapService/Today] Found', tasks.length, 'tasks,', highPriorityCount, 'high priority')
  if (focusTask) {
    console.log('🎯 [RecapService/Today] Focus task:', focusTask.content, 'with score:', focusTask.score, '- Reason:', focusReason)
  }

  return {
    tasks: sortedTasks,
    focusTask,
    focusReason,
    stats: {
      total: tasks.length,
      highPriority: highPriorityCount
    }
  }
}

/**
 * Get meetings for a specific date
 * Extracted for consistency and reusability
 * 
 * @param supabase - Authenticated Supabase client with user session
 * @param userId - User ID (not directly used, but kept for consistency)
 * @param date - Date string in 'yyyy-MM-dd' format
 * @returns Array of meetings for the specified date
 */
export async function getMeetingsForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string
) {
  try {
    // Get session to authorize API call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.warn('⚠️ [RecapService/Meetings] No session available')
      return []
    }
    
    // Call meetings API (Google Calendar integration requires HTTP call)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const meetingsResponse = await fetch(`${baseUrl}/api/day-assistant-v2/meetings?date=${date}`, {
      headers: { 
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (meetingsResponse.ok) {
      const meetingsData = await meetingsResponse.json()
      const meetings = meetingsData.meetings || []
      console.log('✅ [RecapService/Meetings] Found', meetings.length, 'meetings for date:', date)
      return meetings
    } else {
      console.warn('⚠️ [RecapService/Meetings] Failed to fetch meetings:', meetingsResponse.status)
      return []
    }
  } catch (error) {
    console.warn('⚠️ [RecapService/Meetings] Error fetching meetings:', error)
    return []
  }
}
