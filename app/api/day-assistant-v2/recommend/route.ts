/**
 * API Route: /api/day-assistant-v2/recommend
 * POST: Generate real-time recommendations based on current state
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2,
  getOrCreateDayPlan
} from '@/lib/services/dayAssistantV2Service'
import {
  generateSliderChangeRecommendation
} from '@/lib/services/dayAssistantV2RecommendationEngine'
import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'

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
    const { date, trigger, context } = body
    
    if (!date || !context) {
      return NextResponse.json({ error: 'date and context are required' }, { status: 400 })
    }
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Get current day plan
    const dayPlan = await getOrCreateDayPlan(user.id, assistant.id, date)
    if (!dayPlan) {
      return NextResponse.json({ error: 'Failed to get day plan' }, { status: 500 })
    }
    
    // Create updated day plan with new energy/focus values
    const updatedDayPlan: DayPlan = {
      ...dayPlan,
      energy: context.energy || dayPlan.energy,
      focus: context.focus || dayPlan.focus
    }
    
    // Get current tasks for the day
    const tasks: TestDayTask[] = context.current_tasks || []
    
    // Generate recommendations based on context
    let recommendation = null
    
    if (trigger === 'slider_changed' || trigger === 'manual_refresh') {
      recommendation = await generateSliderChangeRecommendation(
        user.id,
        assistant.id,
        assistant,
        tasks,
        dayPlan,
        updatedDayPlan,
        date
      )
    }
    
    // Generate contextual recommendations based on energy/focus state
    const recommendations: string[] = []
    
    // Low energy recommendations
    if (context.energy <= 2) {
      recommendations.push(
        "Niska energia - polecam lekkie zadania z kontekstu 'prywatne' (osobiste, niskointensywne)"
      )
    }
    
    // Low focus recommendations
    if (context.focus <= 2) {
      const heavyTasks = tasks.filter(t => t.cognitive_load >= 4 && !t.completed)
      if (heavyTasks.length > 0) {
        recommendations.push(
          `Przy niskim skupieniu (${context.focus}/5) lepiej przełożyć trudne zadania (np. "${heavyTasks[0].title}") lub użyć techniki "Zacznij 10 min"`
        )
      }
    }
    
    // High energy + high focus recommendations
    if (context.energy >= 4 && context.focus >= 4) {
      const hardestTasks = tasks
        .filter(t => t.cognitive_load >= 4 && !t.completed)
        .sort((a, b) => b.cognitive_load - a.cognitive_load)
      
      if (hardestTasks.length > 0) {
        recommendations.push(
          `Wysoka energia i skupienie (${context.energy}/5, ${context.focus}/5) - idealny moment na: "${hardestTasks[0].title}"`
        )
      }
    }
    
    // Break recommendation based on time worked
    // TODO: Track actual work time from completed tasks
    const estimatedWorkMinutes = tasks
      .filter(t => t.completed)
      .reduce((sum, t) => sum + t.estimate_min, 0)
    
    if (estimatedWorkMinutes >= 120) {
      recommendations.push(
        'Pracujesz już ponad 2h - czas na przerwę! Odpocznij 15 min, wrócisz z większą energią.'
      )
    }
    
    return NextResponse.json({
      success: true,
      recommendation,
      recommendations,
      context_message: recommendations.length > 0 ? recommendations[0] : null
    })
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/recommend:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
