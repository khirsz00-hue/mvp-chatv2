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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Get or create assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Get or create day plan
    const dayPlan = await getOrCreateDayPlan(user.id, assistant.id, date)
    if (!dayPlan) {
      return NextResponse.json({ error: 'Failed to get day plan' }, { status: 500 })
    }
    
    // Get tasks for the date
    const tasks = await getTasks(user.id, assistant.id, { 
      date, 
      includeCompleted: false,
      includeSubtasks: true
    })
    
    // Get active proposals
    const proposals = await getActiveProposals(user.id, assistant.id, date)
    
    return NextResponse.json({
      dayPlan,
      tasks,
      proposals,
      assistant
    })
  } catch (error) {
    console.error('Error in GET /api/day-assistant-v2/dayplan:', error)
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
