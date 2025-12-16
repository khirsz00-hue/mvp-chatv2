import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { generateRecommendations, findMeetingSlots } from '@/lib/dayAssistant/RecommendationEngine'
import { 
  inferMomentum, 
  findAvailableWindows, 
  calculateOverloadScore,
  DayContext 
} from '@/lib/dayAssistant/DayContext'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

/**
 * GET: Generate recommendations for the user
 * 
 * Analyzes current day state and returns actionable recommendations
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // 1. Get user's energy mode
    const { data: energyState } = await supabase
      .from('user_energy_state')
      .select('current_mode')
      .eq('user_id', userId)
      .single()

    const energyMode = energyState?.current_mode || 'normal'

    // 2. Get incomplete tasks
    const { data: tasks } = await supabase
      .from('day_assistant_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .in('priority', ['now', 'next'])
      .order('position')

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ 
        recommendations: [],
        context: { energyMode, taskCount: 0 }
      })
    }

    // 3. Get recent activity to infer momentum
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: recentActions } = await supabase
      .from('task_action_history')
      .select('action_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    // Count completions and interruptions
    const completions = recentActions?.filter(a => 
      a.action_type === 'move_to_now' || a.action_type === 'pin_today'
    ).length || 0

    const interruptions = recentActions?.filter(a => 
      a.action_type === 'not_today'
    ).length || 0

    const lastActionTime = recentActions && recentActions.length > 0 
      ? new Date(recentActions[0].created_at)
      : new Date(Date.now() - 120 * 60 * 1000)
    
    const timeSinceLastAction = (Date.now() - lastActionTime.getTime()) / 60000

    const momentum = inferMomentum(completions, interruptions, timeSinceLastAction)

    // 4. Get timeline events for today
    const today = new Date().toISOString().split('T')[0]
    const { data: timelineEvents } = await supabase
      .from('day_timeline_events')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)

    const events = timelineEvents || []
    
    // 5. Calculate available time windows
    const workingHours = { start: 9, end: 17 }  // TODO: Get from user preferences
    const existingEvents = events.map(e => ({
      start: `${today}T${e.start_time}:00`,
      end: `${today}T${e.end_time}:00`
    }))

    const availableWindows = findAvailableWindows(workingHours, existingEvents)
    const totalAvailableMinutes = availableWindows.reduce((sum, w) => sum + w.minutes, 0)

    // 6. Calculate overload score
    const totalTaskMinutes = tasks.reduce((sum: number, t: any) => sum + t.estimated_duration, 0)
    const urgentTaskCount = tasks.filter((t: any) => t.is_mega_important || t.is_pinned).length
    const overloadScore = calculateOverloadScore(totalTaskMinutes, totalAvailableMinutes, urgentTaskCount)

    // 7. Generate recommendations
    const recommendations = generateRecommendations(
      tasks,
      energyMode,
      momentum,
      totalAvailableMinutes
    )

    // 8. Build day context for response
    const dayContext: DayContext = {
      dateKey: today,
      now: new Date().toISOString(),
      energyMode,
      momentum,
      availableWindows,
      overloadScore
    }

    return NextResponse.json({
      recommendations,
      context: dayContext
    })
  } catch (err: any) {
    console.error('Error in GET /api/day-assistant/recommendations:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST: Get meeting slot recommendations
 */
export async function POST(req: Request) {
  try {
    const { userId, durationMinutes, preferredHours } = await req.json()

    if (!userId || !durationMinutes) {
      return NextResponse.json(
        { error: 'Missing userId or durationMinutes' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Get timeline events
    const { data: timelineEvents } = await supabase
      .from('day_timeline_events')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)

    const events = timelineEvents || []

    // Calculate available windows
    const workingHours = { start: 9, end: 17 }
    const existingEvents = events.map(e => ({
      start: `${today}T${e.start_time}:00`,
      end: `${today}T${e.end_time}:00`
    }))

    const availableWindows = findAvailableWindows(workingHours, existingEvents)

    // Find best meeting slots
    const slots = findMeetingSlots(
      availableWindows,
      durationMinutes,
      preferredHours || [10, 16],
      3
    )

    return NextResponse.json({ slots })
  } catch (err: any) {
    console.error('Error in POST /api/day-assistant/recommendations:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
