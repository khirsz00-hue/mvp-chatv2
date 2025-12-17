import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { format, addMinutes, parseISO } from 'date-fns'
import { getQueueState } from '@/lib/services/dayAssistantService'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

interface TimelineEvent {
  id: string
  type: 'meeting' | 'event' | 'task-block' | 'ghost-proposal' | 'queue-task'
  title: string
  startTime: string
  endTime: string
  duration: number
  taskIds?: string[]
  priority?: 'now' | 'next' | 'later'
  mutable?: boolean
  metadata?: Record<string, any>
}

// GET: Fetch timeline events for a specific date
// Uses authenticated user context via RLS
// Builds timeline from queue data (NOW/NEXT/LATER tasks)
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user?.id) {
      console.error('[Timeline API GET] No authenticated user - session missing')
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const userId = user.id
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
    const includeAll = searchParams.get('includeAll') === 'true'

    console.log('🔍 [API Timeline GET] Authenticated user:', userId, 'date:', date)

    const events: TimelineEvent[] = []

    // 1. Build timeline from queue data (NOW/NEXT/LATER)
    // This preserves priority ordering and energy-mode constraints
    const queueState = await getQueueState(userId, includeAll, supabase)
    
    let currentTime = new Date()
    // Start scheduling from current time or 9 AM, whichever is later
    const workStartHour = 9
    const now = new Date()
    if (now.getHours() < workStartHour) {
      currentTime = new Date(now.setHours(workStartHour, 0, 0, 0))
    }

    // Schedule NOW task first
    if (queueState.now) {
      const task = queueState.now
      const startTime = format(currentTime, 'HH:mm')
      const endDate = addMinutes(currentTime, task.estimated_duration)
      const endTime = format(endDate, 'HH:mm')
      
      events.push({
        id: task.id,
        type: 'queue-task',
        title: `🎯 NOW: ${task.title}`,
        startTime,
        endTime,
        duration: task.estimated_duration,
        taskIds: [task.id],
        priority: 'now',
        mutable: true,
        metadata: { taskId: task.id, priority: 'now', isPinned: task.is_pinned }
      })
      
      currentTime = endDate
    }

    // Schedule NEXT tasks in order
    if (queueState.next && queueState.next.length > 0) {
      for (const task of queueState.next) {
        const startTime = format(currentTime, 'HH:mm')
        const endDate = addMinutes(currentTime, task.estimated_duration)
        const endTime = format(endDate, 'HH:mm')
        
        events.push({
          id: task.id,
          type: 'queue-task',
          title: `⏭️ NEXT: ${task.title}`,
          startTime,
          endTime,
          duration: task.estimated_duration,
          taskIds: [task.id],
          priority: 'next',
          mutable: true,
          metadata: { taskId: task.id, priority: 'next', isPinned: task.is_pinned }
        })
        
        currentTime = endDate
      }
    }

    // Optionally include LATER tasks if requested
    if (includeAll && queueState.later && queueState.later.length > 0) {
      for (const task of queueState.later.slice(0, 5)) { // Limit to first 5
        const startTime = format(currentTime, 'HH:mm')
        const endDate = addMinutes(currentTime, task.estimated_duration)
        const endTime = format(endDate, 'HH:mm')
        
        events.push({
          id: task.id,
          type: 'queue-task',
          title: `📋 LATER: ${task.title}`,
          startTime,
          endTime,
          duration: task.estimated_duration,
          taskIds: [task.id],
          priority: 'later',
          mutable: true,
          metadata: { taskId: task.id, priority: 'later' }
        })
        
        currentTime = endDate
      }
    }

    // 2. Fetch manual task blocks from database (overlay on queue)
    const { data: taskBlocks } = await supabase
      .from('day_timeline_events')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('type', 'task-block')

    if (taskBlocks) {
      taskBlocks.forEach((block: any) => {
        events.push({
          id: block.id,
          type: 'task-block',
          title: block.title,
          startTime: block.start_time,
          endTime: block.end_time,
          duration: block.duration_minutes,
          taskIds: block.task_ids || [],
          mutable: true,
          metadata: block.metadata
        })
      })
    }

    // 3. Fetch ghost proposals (AI suggestions)
    const { data: proposals } = await supabase
      .from('day_timeline_events')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('type', 'ghost-proposal')

    if (proposals) {
      proposals.forEach((proposal: any) => {
        events.push({
          id: proposal.id,
          type: 'ghost-proposal',
          title: proposal.title,
          startTime: proposal.start_time,
          endTime: proposal.end_time,
          duration: proposal.duration_minutes,
          taskIds: proposal.task_ids || [],
          mutable: true,
          metadata: proposal.metadata
        })
      })
    }

    // Sort events by start time
    events.sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number)
      const timeB = b.startTime.split(':').map(Number)
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1])
    })

    console.log(`✅ [API Timeline] Built timeline with ${events.length} events (NOW: ${queueState.now ? 1 : 0}, NEXT: ${queueState.next.length})`)

    return NextResponse.json({ events, queueSummary: {
      nowCount: queueState.now ? 1 : 0,
      nextCount: queueState.next.length,
      laterCount: queueState.laterCount
    }})
  } catch (err: any) {
    console.error('Error in GET /api/day-assistant/timeline:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Create a new timeline event (task block or proposal)
// Uses authenticated user context via RLS
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user?.id) {
      console.error('[Timeline API POST] No authenticated user - session missing')
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const userId = user.id
    console.log('🔍 [API Timeline POST] Authenticated user:', userId)

    const { date, type, title, startTime, duration, taskIds, metadata } = await req.json()

    if (!date || !type || !title || !startTime || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: date, type, title, startTime, or duration' },
        { status: 400 }
      )
    }

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = addMinutes(startDate, duration)
    const endTime = format(endDate, 'HH:mm')

    const { data, error } = await supabase
      .from('day_timeline_events')
      .insert({
        user_id: userId,
        date,
        type,
        title,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
        task_ids: taskIds || [],
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating timeline event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (err: any) {
    console.error('Error in POST /api/day-assistant/timeline:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
