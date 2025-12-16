import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { format, addMinutes, parseISO } from 'date-fns'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

interface TimelineEvent {
  id: string
  type: 'meeting' | 'event' | 'task-block' | 'ghost-proposal'
  title: string
  startTime: string
  endTime: string
  duration: number
  taskIds?: string[]
  mutable?: boolean
  metadata?: Record<string, any>
}

// GET: Fetch timeline events for a specific date
// Uses authenticated user context via RLS
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

    console.log('🔍 [API Timeline GET] Authenticated user:', userId, 'date:', date)

    const events: TimelineEvent[] = []

    // 1. Fetch calendar events (meetings) from Google Calendar
    // Note: In server-side context, we need to use Supabase to fetch calendar events
    // or call Google Calendar API directly. Relative URLs don't work in Next.js API routes.
    // For now, we'll skip calendar integration and rely on manual timeline events.
    // TODO: Implement direct Google Calendar API integration
    try {
      // Placeholder for future Google Calendar integration
      // This would call googleapis directly with user's refresh token from Supabase
      console.log('Calendar integration pending - add Google Calendar API calls here')
    } catch (error) {
      console.error('Error fetching calendar events:', error)
    }

    // 2. Fetch task blocks from database
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

    return NextResponse.json({ events })
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
