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
  generateSliderChangeRecommendation,
  generateRecommendation
} from '@/lib/services/dayAssistantV2RecommendationEngine'
import { TestDayTask, DayPlan, Recommendation } from '@/lib/types/dayAssistantV2'
import { differenceInHours, isFuture, isToday } from 'date-fns'
import { groupBy } from 'lodash'
import { analyzeContextSwitching, generateSwitchingRecommendation } from '@/lib/contextSwitching'
import { assessBurnoutRisk } from '@/lib/burnoutPrevention'

// Thresholds for overdue task recommendations
const LOW_ENERGY_THRESHOLD = 2
const LOW_COGNITIVE_LOAD_THRESHOLD = 2
const MODERATE_DEBT_THRESHOLD = 5
const HIGH_DEBT_THRESHOLD = 10

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
    
    // Get current tasks for the day
    const tasks: TestDayTask[] = context.current_tasks || []
    const incompleteTasks = tasks.filter(t => !t.completed)
    
    // Generate recommendations
    const recommendations: Recommendation[] = []

    // 0. Check burnout risk (high priority check)
    try {
      const burnoutRisk = await assessBurnoutRisk(user.id)
      if (burnoutRisk.riskLevel === 'high') {
        recommendations.push({
          id: `burnout-warning-${Date.now()}`,
          type: 'BURNOUT_WARNING',
          title: `🚨 UWAGA: Wykryto ryzyko wypalenia (${burnoutRisk.riskScore}/100)`,
          reason: `${burnoutRisk.warnings.join('. ')}`,
          actions: [
            { op: 'SHOW_BURNOUT_MODAL' }
          ],
          confidence: 0.95,
          created_at: new Date().toISOString()
        })
      } else if (burnoutRisk.riskLevel === 'medium') {
        recommendations.push({
          id: `burnout-warning-${Date.now()}`,
          type: 'BURNOUT_WARNING',
          title: `⚠️ Średnie ryzyko wypalenia (${burnoutRisk.riskScore}/100)`,
          reason: `${burnoutRisk.warnings.join('. ')}`,
          actions: [
            { op: 'ADD_BREAK', durationMinutes: 15 }
          ],
          confidence: 0.8,
          created_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('⚠️ [Recommend] Failed to assess burnout risk:', error)
    }

    // 0.5. Check context switching in queue
    const queueTasks = context.queue || incompleteTasks.slice(0, 10)
    const switchingAnalysis = analyzeContextSwitching(queueTasks)
    const switchingRec = generateSwitchingRecommendation(switchingAnalysis)
    if (switchingRec) {
      recommendations.push({
        ...switchingRec,
        created_at: new Date().toISOString()
      } as Recommendation)
    }

    // 1. Check for work time without break (>2h)
    const completedToday = tasks.filter(t => t.completed)
    const workMinutes = completedToday.reduce((sum, t) => sum + t.estimate_min, 0)
    
    if (workMinutes >= 120) {
      recommendations.push({
        id: `break-${Date.now()}`,
        type: 'ADD_BREAK',
        title: 'Czas na przerwę!',
        reason: `Pracujesz już ${Math.round(workMinutes / 60)}h bez przerwy. Odpoczynek zwiększy produktywność.`,
        actions: [
          { op: 'ADD_BREAK', durationMinutes: 15 }
        ],
        confidence: 0.9,
        created_at: new Date().toISOString()
      })
    }

    // 2. Group similar tasks (3+ with same context_type)
    const tasksByContext = groupBy(incompleteTasks, 'context_type')
    for (const [contextType, contextTasks] of Object.entries(tasksByContext)) {
      if (contextTasks.length >= 3 && contextType && contextType !== 'null') {
        const taskIds = contextTasks.map(t => t.id)
        recommendations.push({
          id: `group-${contextType}-${Date.now()}`,
          type: 'GROUP_SIMILAR',
          title: `Zgrupuj ${contextType} (${contextTasks.length} zadań)`,
          reason: 'Zmniejszysz przełączanie kontekstu. Kolejka zostanie przeorganizowana.',
          actions: [
            { op: 'REORDER_TASKS', taskIds, priority: 'group' }
          ],
          confidence: 0.85,
          created_at: new Date().toISOString()
        })
      }
    }

    // 3. Energy vs cognitive load mismatch
    const mustTasks = incompleteTasks.filter(t => t.is_must)
    for (const task of mustTasks) {
      if (task.cognitive_load >= 4 && context.energy <= 2) {
        recommendations.push({
          id: `energy-mismatch-${task.id}`,
          type: 'ENERGY_MISMATCH',
          title: 'Zadanie MUST jest za trudne',
          reason: `"${task.title}" wymaga dużo energii (${task.cognitive_load}/5), a masz tylko ${context.energy}/5`,
          actions: [
            { op: 'CHANGE_MUST', taskId: task.id, pin: false },
            { op: 'ADD_BREAK', durationMinutes: 10 }
          ],
          confidence: 0.75,
          created_at: new Date().toISOString()
        })
      }
    }

    // 4. Upcoming meetings - short tasks recommendation
    // TODO: Integrate with Google Calendar when available
    // For now, we'll skip this recommendation
    
    // 5. High energy + focus = tackle hardest tasks
    if (context.energy >= 4 && context.focus >= 4) {
      const hardestTasks = incompleteTasks
        .filter(t => t.cognitive_load >= 4)
        .sort((a, b) => b.cognitive_load - a.cognitive_load)
        .slice(0, 3)
      
      if (hardestTasks.length > 0) {
        recommendations.push({
          id: `high-energy-${Date.now()}`,
          type: 'HIGH_ENERGY',
          title: 'Idealny moment na trudne zadania!',
          reason: `Wysoka energia i skupienie (${context.energy}/5, ${context.focus}/5) - zacznij od: "${hardestTasks[0].title}"`,
          actions: [
            { op: 'REORDER_TASKS', taskIds: hardestTasks.map(t => t.id), priority: 'high' }
          ],
          confidence: 0.95,
          created_at: new Date().toISOString()
        })
      }
    }

    // 6. Low energy = suggest light tasks
    if (context.energy <= 2) {
      const lightTasks = incompleteTasks
        .filter(t => t.cognitive_load <= 2)
        .slice(0, 3)
      
      if (lightTasks.length > 0) {
        recommendations.push({
          id: `low-energy-${Date.now()}`,
          type: 'LOW_ENERGY',
          title: 'Przy niskiej energii - lekkie zadania',
          reason: `Niska energia (${context.energy}/5) - polecam lekkie zadania (${lightTasks.length} dostępnych)`,
          actions: [
            { op: 'REORDER_TASKS', taskIds: lightTasks.map(t => t.id), priority: 'high' }
          ],
          confidence: 0.8,
          created_at: new Date().toISOString()
        })
      }
    }
    
    // 7. Overdue tasks - suggest easy ones at low energy
    const overdueTasks = incompleteTasks.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today
    })
    
    if (overdueTasks.length > 0) {
      // Recommend easy overdue at low energy
      if (context.energy <= LOW_ENERGY_THRESHOLD) {
        const easyOverdue = overdueTasks
          .filter(t => t.cognitive_load <= LOW_COGNITIVE_LOAD_THRESHOLD)
          .sort((a, b) => a.cognitive_load - b.cognitive_load)
        
        if (easyOverdue.length > 0) {
          recommendations.push({
            id: `overdue-easy-${Date.now()}`,
            type: 'OVERDUE_EASY',
            title: 'Zacznij od łatwego przeterminowanego',
            reason: `"${easyOverdue[0].title}" jest proste (Load ${easyOverdue[0].cognitive_load}) - idealny start przy niskiej energii`,
            actions: [
              { op: 'REORDER_TASKS', taskIds: [easyOverdue[0].id], priority: 'high' }
            ],
            confidence: 0.85,
            created_at: new Date().toISOString()
          })
        }
      }
      
      // Task debt warning for many overdue tasks
      if (overdueTasks.length >= HIGH_DEBT_THRESHOLD) {
        recommendations.push({
          id: `task-debt-warning-${Date.now()}`,
          type: 'TASK_DEBT_WARNING',
          title: `⚠️ Duży dług zadaniowy (${overdueTasks.length} przeterminowanych)`,
          reason: 'Rozważ przegląd i usunięcie nieaktualnych zadań',
          actions: [
            { op: 'OPEN_MORNING_REVIEW' }
          ],
          confidence: 0.9,
          created_at: new Date().toISOString()
        })
      } else if (overdueTasks.length >= MODERATE_DEBT_THRESHOLD) {
        // Moderate debt warning
        recommendations.push({
          id: `overdue-review-${Date.now()}`,
          type: 'OVERDUE_REVIEW',
          title: `⏰ ${overdueTasks.length} zadań przeterminowanych`,
          reason: 'Sprawdź przeterminowane zadania i zdecyduj czy są nadal aktualne',
          actions: [
            { op: 'OPEN_MORNING_REVIEW' }
          ],
          confidence: 0.7,
          created_at: new Date().toISOString()
        })
      }
    }
    
    // ✅ FILTER OUT already applied recommendations from database
    // This prevents recommendations from reappearing after background sync
    // Use authenticated client for RLS policies
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: request.headers.get('Authorization') || '' }
        }
      }
    )
    
    const { data: appliedRecs, error: appliedError } = await supabaseAuth
      .from('day_assistant_v2_applied_recommendations')
      .select('recommendation_id')
      .eq('user_id', user.id)
    
    if (appliedError) {
      console.error('⚠️ [Recommend] Failed to fetch applied recommendations:', appliedError)
      console.error('⚠️ [Recommend] Error details:', { 
        code: appliedError.code, 
        message: appliedError.message,
        details: appliedError.details 
      })
      // Continue without filtering - graceful degradation
      // Better to show duplicate recommendations than none at all
    }
    
    const appliedIds = new Set(appliedRecs?.map(r => r.recommendation_id) || [])
    const activeRecommendations = recommendations.filter(rec => !appliedIds.has(rec.id))
    
    console.log(`🔍 [Recommend] Generated ${recommendations.length} recommendations, ${appliedIds.size} already applied, returning ${activeRecommendations.length} active`)
    
    return NextResponse.json({
      success: true,
      recommendations: activeRecommendations
    })
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/recommend:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
