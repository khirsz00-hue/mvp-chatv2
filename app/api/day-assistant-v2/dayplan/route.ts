/**
 * API Route: /api/day-assistant-v2/dayplan
 * GET: Fetch day plan with timeline and proposals
 * POST: Update day plan (energy/focus sliders)
 * PUT: Update day plan metadata (work hours, capacity)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2,
  getOrCreateDayPlan,
  updateDayPlan,
  getTasks,
  getActiveProposals
} from '@/lib/services/dayAssistantV2Service'
import { generateSliderChangeRecommendation } from '@/lib/services/dayAssistantV2RecommendationEngine'

interface DayPlanMetadata {
  work_hours_start?: string
  work_hours_end?: string
  capacity_minutes?: number
  [key: string]: any
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[dayplan API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Debug logging - TODO: Consider removing or gating behind env variable in production
    // Log authenticated user
    console.log('[dayplan API] Authenticated user:', user.id)
    
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const includeAllDates = searchParams.get('includeAllDates') === 'true'
    
    // Log date parameter
    console.log('[dayplan API] Request parameters:', { 
      date, 
      includeAllDates,
      requestedDate: searchParams.get('date'),
      defaultedToToday: !searchParams.get('date')
    })
    
    // Get or create assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      console.error('[dayplan API] Failed to get or create assistant for user:', user.id)
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Log assistant ID
    console.log('[dayplan API] Assistant retrieved:', { 
      assistantId: assistant.id,
      assistantName: assistant.name,
      assistantType: assistant.type
    })
    
    // Get or create day plan
    const dayPlan = await getOrCreateDayPlan(user.id, assistant.id, date)
    if (!dayPlan) {
      console.error('[dayplan API] Failed to get or create day plan:', { 
        userId: user.id, 
        assistantId: assistant.id, 
        date 
      })
      return NextResponse.json({ error: 'Failed to get day plan' }, { status: 500 })
    }
    
    console.log('[dayplan API] Day plan retrieved:', {
      dayPlanId: dayPlan.id,
      planDate: dayPlan.plan_date,
      energy: dayPlan.energy,
      focus: dayPlan.focus
    })
    
    // Get tasks for the date (active only for queue rendering)
    const tasks = await getTasks(user.id, assistant.id, { 
      date, 
      includeCompleted: false,
      includeSubtasks: true,
      includeAllDates
    })
    
    // Get full task list for stats (including completed)
    const allTasks = await getTasks(user.id, assistant.id, {
      date,
      includeCompleted: true,
      includeSubtasks: false,
      includeAllDates
    })
    
    const tasksDueToday = allTasks.filter(t => t.due_date === date)
    const completedDueToday = tasksDueToday.filter(t => t.completed).length
    const totalToday = tasksDueToday.length
    const completedToday = allTasks.filter(t => {
      const completedDate = t.completed_at ? t.completed_at.split('T')[0] : null
      if (completedDate) return completedDate === date
      return t.completed && t.due_date === date
    }).length
    const movedFromToday = allTasks.filter(
      t => t.moved_from_date === date && t.due_date && t.due_date !== date
    ).length
    const movedToToday = allTasks.filter(
      t => t.due_date === date && t.moved_from_date && t.moved_from_date !== date
    ).length
    const addedToday = allTasks.filter(t => {
      if (!t.created_at) return false
      const createdDate = t.created_at.split('T')[0]
      return createdDate === date
    }).length
    
    const taskStats = {
      completedToday,
      totalToday,
      pendingToday: Math.max(totalToday - completedDueToday, 0),
      movedFromToday,
      movedToToday,
      addedToday
    }
    
    // Log tasks count
    console.log('[dayplan API] Tasks retrieved:', tasks.length)
    
    // 📊 Debug logging for cognitive_load and estimate_min
    if (tasks.length > 0) {
      console.log('📊 [dayplan API] Cognitive load verification (first 5 tasks):')
      tasks.slice(0, 5).forEach((t, idx) => {
        console.log(`  #${idx + 1}. "${t.title.substring(0, 40)}"`)
        console.log(`      cognitive_load: ${t.cognitive_load} (type: ${typeof t.cognitive_load})`)
        console.log(`      estimate_min: ${t.estimate_min} (type: ${typeof t.estimate_min})`)
        console.log(`      due_date: ${t.due_date}`)
        console.log(`      priority: ${t.priority}`)
      })
    }
    
    // Get active proposals
    const proposals = await getActiveProposals(user.id, assistant.id, date)
    
    // Log proposals count
    console.log('[dayplan API] Active proposals retrieved:', proposals.length)
    
    // Log full response summary
    console.log('[dayplan API] Returning response:', {
      tasksCount: tasks.length,
      proposalsCount: proposals.length,
      dayPlanExists: !!dayPlan,
      assistantExists: !!assistant,
      date,
      userId: user.id,
      assistantId: assistant.id
    })
    
    return NextResponse.json({
      dayPlan,
      tasks,
      proposals,
      assistant,
      taskStats
    })
  } catch (error) {
    console.error('[dayplan API] Error in GET /api/day-assistant-v2/dayplan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { date, energy, focus } = body
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Get current day plan
    const oldPlan = await getOrCreateDayPlan(user.id, assistant.id, date)
    if (!oldPlan) {
      return NextResponse.json({ error: 'Failed to get day plan' }, { status: 500 })
    }
    
    // Update day plan
    const updates: any = {}
    if (energy !== undefined) updates.energy = energy
    if (focus !== undefined) updates.focus = focus
    
    const updatedPlan = await updateDayPlan(user.id, assistant.id, date, updates)
    if (!updatedPlan) {
      return NextResponse.json({ error: 'Failed to update day plan' }, { status: 500 })
    }
    
    // Generate recommendation if sliders changed significantly
    let newProposal = null
    if (energy !== undefined || focus !== undefined) {
      const tasks = await getTasks(user.id, assistant.id, { date, includeCompleted: false })
      newProposal = await generateSliderChangeRecommendation(
        user.id,
        assistant.id,
        assistant,
        tasks,
        oldPlan,
        updatedPlan,
        date
      )
    }
    
    return NextResponse.json({
      dayPlan: updatedPlan,
      proposal: newProposal,
      message: 'Day plan updated successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/dayplan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { date, metadata } = body as { date: string; metadata?: DayPlanMetadata }
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Get or create day plan
    const dayPlan = await getOrCreateDayPlan(user.id, assistant.id, date)
    if (!dayPlan) {
      return NextResponse.json({ error: 'Failed to get day plan' }, { status: 500 })
    }
    
    // Update metadata
    const updates: Partial<{ metadata: DayPlanMetadata }> = {}
    if (metadata) {
      updates.metadata = { ...dayPlan.metadata, ...metadata }
    }
    
    const updatedPlan = await updateDayPlan(user.id, assistant.id, date, updates)
    if (!updatedPlan) {
      return NextResponse.json({ error: 'Failed to update day plan' }, { status: 500 })
    }
    
    return NextResponse.json({
      dayPlan: updatedPlan,
      message: 'Day plan metadata updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT /api/day-assistant-v2/dayplan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
