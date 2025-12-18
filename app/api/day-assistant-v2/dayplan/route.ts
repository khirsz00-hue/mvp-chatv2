/**
 * API Route: /api/day-assistant-v2/dayplan
 * GET: Fetch day plan with timeline and proposals
 * POST: Update day plan (energy/focus sliders)
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
    
    // Get tasks for the date
    const tasks = await getTasks(user.id, assistant.id, { 
      date, 
      includeCompleted: false,
      includeSubtasks: true,
      includeAllDates
    })
    
    // Log tasks count
    console.log('[dayplan API] Tasks retrieved:', tasks.length)
    
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
      assistant
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
