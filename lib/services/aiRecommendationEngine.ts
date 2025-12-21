/**
 * AI Recommendation Engine
 * Generates smart, context-aware recommendations for task management
 */

import { TestDayTask, DayPlan, ProposalAction } from '@/lib/types/dayAssistantV2'
import { UserBehaviorProfile } from './intelligentScoringEngine'

// Recommendation types
export type RecommendationType = 
  | 'BATCH'           // Group similar tasks
  | 'ENERGY_MATCH'    // Energy mismatch warning
  | 'DECOMPOSE'       // Break down large task
  | 'REORDER'         // Suggest different order
  | 'DEFER'           // Postpone low-probability tasks

export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW'

// Smart Recommendation
export interface SmartRecommendation {
  type: RecommendationType
  title: string
  reasoning: string[]  // Polish explanations
  confidence: number   // 0-1
  impact: ImpactLevel
  actions: ProposalAction[]
  expectedOutcome: {
    timeSaved: number              // Minutes
    stressReduction: number        // 0-1
    completionProbability: number  // 0-1
  }
}

/**
 * Generate all smart recommendations for current context
 */
export function generateSmartRecommendations(
  tasks: TestDayTask[],
  dayPlan: DayPlan,
  profile: UserBehaviorProfile,
  context: {
    currentDate: string
    currentHour: number
    availableMinutes: number
  }
): SmartRecommendation[] {
  const recommendations: SmartRecommendation[] = []

  // 1. Detect batching opportunities
  const batchingRec = detectBatchingOpportunity(tasks, context)
  if (batchingRec) recommendations.push(batchingRec)

  // 2. Detect energy mismatches
  const energyRec = detectEnergyMismatch(tasks, dayPlan, context)
  if (energyRec) recommendations.push(energyRec)

  // 3. Detect decomposition needs
  const decomposeRec = detectDecompositionNeed(tasks, profile, context)
  if (decomposeRec) recommendations.push(decomposeRec)

  // 4. Detect reordering opportunities
  const reorderRec = detectReorderOpportunity(tasks, dayPlan, profile, context)
  if (reorderRec) recommendations.push(reorderRec)

  // 5. Detect defer candidates
  const deferRec = detectDeferOpportunity(tasks, profile, context)
  if (deferRec) recommendations.push(deferRec)

  // Sort by impact and confidence
  return recommendations.sort((a, b) => {
    const impactWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 }
    const scoreA = impactWeight[a.impact] * a.confidence
    const scoreB = impactWeight[b.impact] * b.confidence
    return scoreB - scoreA
  })
}

/**
 * Detect batching opportunity - similar tasks that should be grouped
 */
export function detectBatchingOpportunity(
  tasks: TestDayTask[],
  context: { currentDate: string; availableMinutes: number }
): SmartRecommendation | null {
  // Group tasks by context_type
  const contextGroups: Record<string, TestDayTask[]> = {}
  
  for (const task of tasks) {
    if (!task.completed && task.context_type) {
      if (!contextGroups[task.context_type]) {
        contextGroups[task.context_type] = []
      }
      contextGroups[task.context_type].push(task)
    }
  }

  // Find groups with 3+ tasks
  for (const [contextType, groupTasks] of Object.entries(contextGroups)) {
    if (groupTasks.length >= 3) {
      const totalTime = groupTasks.reduce((sum, t) => sum + t.estimate_min, 0)
      
      if (totalTime <= context.availableMinutes) {
        const reasoning = [
          `Masz ${groupTasks.length} zadań w kontekście "${contextType}"`,
          'Grupowanie podobnych zadań zmniejsza koszt przełączania kontekstu',
          `Łączny czas: ${totalTime} minut`
        ]

        const actions: ProposalAction[] = groupTasks.map((task, index) => ({
          type: 'reorder_task',
          task_id: task.id,
          metadata: { new_position: index }
        }))

        return {
          type: 'BATCH',
          title: `Zgrupuj ${groupTasks.length} zadań "${contextType}"`,
          reasoning,
          confidence: 0.85,
          impact: 'HIGH',
          actions,
          expectedOutcome: {
            timeSaved: groupTasks.length * 5,  // 5 min saved per context switch avoided
            stressReduction: 0.3,
            completionProbability: 0.8
          }
        }
      }
    }
  }

  return null
}

/**
 * Detect energy mismatch - tasks not aligned with current energy/focus
 */
export function detectEnergyMismatch(
  tasks: TestDayTask[],
  dayPlan: DayPlan,
  context: { currentDate: string; currentHour: number }
): SmartRecommendation | null {
  const currentState = (dayPlan.energy + dayPlan.focus) / 2
  const incompleteTasks = tasks.filter(t => !t.completed)

  // Find tasks with major mismatch
  const mismatches = incompleteTasks
    .filter(t => Math.abs(t.cognitive_load - currentState) >= 3)
    .slice(0, 3)  // Top 3 mismatches

  if (mismatches.length === 0) return null

  const worstTask = mismatches[0]
  const isTooHard = worstTask.cognitive_load > currentState

  const reasoning = [
    isTooHard 
      ? `Zadanie "${worstTask.title}" jest zbyt wymagające dla obecnego stanu`
      : `Przy obecnej energii/skupieniu możesz zająć się bardziej wymagającymi zadaniami`,
    `Obecny stan: ${dayPlan.energy}/5 energia, ${dayPlan.focus}/5 skupienie`,
    `Obciążenie zadania: ${worstTask.cognitive_load}/5`
  ]

  const tomorrow = new Date(context.currentDate)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const actions: ProposalAction[] = isTooHard 
    ? [
        {
          type: 'move_task',
          task_id: worstTask.id,
          from_date: context.currentDate,
          to_date: tomorrow.toISOString().split('T')[0],
          reason: 'Energy mismatch'
        }
      ]
    : []  // For "too easy" case, no specific action - just awareness

  return {
    type: 'ENERGY_MATCH',
    title: isTooHard ? 'Zadanie za trudne dla obecnego stanu' : 'Możesz wziąć się za trudniejsze zadania',
    reasoning,
    confidence: 0.75,
    impact: isTooHard ? 'HIGH' : 'MEDIUM',
    actions,
    expectedOutcome: {
      timeSaved: 0,
      stressReduction: isTooHard ? 0.4 : 0.1,
      completionProbability: isTooHard ? 0.7 : 0.85
    }
  }
}

/**
 * Detect decomposition need - tasks that should be broken down
 */
export function detectDecompositionNeed(
  tasks: TestDayTask[],
  profile: UserBehaviorProfile,
  context: { currentDate: string; availableMinutes: number }
): SmartRecommendation | null {
  const incompleteTasks = tasks.filter(t => !t.completed)

  // Find tasks that are:
  // 1. Much longer than preferred duration (2x+)
  // 2. Have been postponed multiple times
  // 3. Don't have subtasks
  const candidates = incompleteTasks.filter(t => 
    t.estimate_min > profile.preferred_task_duration * 2 &&
    t.postpone_count >= 2 &&
    (!t.subtasks || t.subtasks.length === 0)
  )

  if (candidates.length === 0) return null

  const task = candidates[0]  // Pick first candidate
  const targetDuration = Math.min(25, profile.preferred_task_duration)

  const reasoning = [
    `Zadanie "${task.title}" jest długie (${task.estimate_min} min)`,
    `Było już odkładane ${task.postpone_count} razy`,
    `Rozbicie na mniejsze części może pomóc w ukończeniu`,
    `Proponuję sesje po ${targetDuration} minut`
  ]

  const actions: ProposalAction[] = [
    {
      type: 'decompose_task',
      task_id: task.id,
      metadata: { 
        target_duration: targetDuration,
        create_subtasks: true
      }
    }
  ]

  return {
    type: 'DECOMPOSE',
    title: `Rozbij zadanie "${task.title}" na mniejsze części`,
    reasoning,
    confidence: 0.8,
    impact: 'HIGH',
    actions,
    expectedOutcome: {
      timeSaved: 0,
      stressReduction: 0.5,
      completionProbability: 0.75
    }
  }
}

/**
 * Detect reordering opportunity based on predictions
 */
export function detectReorderOpportunity(
  tasks: TestDayTask[],
  dayPlan: DayPlan,
  profile: UserBehaviorProfile,
  context: { currentDate: string; currentHour: number }
): SmartRecommendation | null {
  const incompleteTasks = tasks.filter(t => !t.completed).slice(0, 5)
  
  if (incompleteTasks.length < 3) return null

  // Check if first task in queue is low-energy but current state is high
  const currentState = (dayPlan.energy + dayPlan.focus) / 2
  const firstTask = incompleteTasks[0]

  if (currentState >= 4 && firstTask.cognitive_load <= 2) {
    // Find a harder task that would be better suited
    const harderTask = incompleteTasks.find(t => t.cognitive_load >= 4)
    
    if (harderTask) {
      const reasoning = [
        'Masz teraz wysoką energię i skupienie',
        `Zamiast lekkiego zadania "${firstTask.title}"`,
        `Lepiej zabrać się za "${harderTask.title}"`
      ]

      const actions: ProposalAction[] = [
        {
          type: 'reorder_task',
          task_id: harderTask.id,
          metadata: { new_position: 0 }
        }
      ]

      return {
        type: 'REORDER',
        title: 'Wykorzystaj wysoką energię',
        reasoning,
        confidence: 0.7,
        impact: 'MEDIUM',
        actions,
        expectedOutcome: {
          timeSaved: 10,
          stressReduction: 0.2,
          completionProbability: 0.8
        }
      }
    }
  }

  return null
}

/**
 * Detect defer opportunity - tasks with low completion probability
 */
export function detectDeferOpportunity(
  tasks: TestDayTask[],
  profile: UserBehaviorProfile,
  context: { currentDate: string; availableMinutes: number }
): SmartRecommendation | null {
  const incompleteTasks = tasks.filter(t => !t.completed && !t.is_must)

  // Find tasks that:
  // 1. Have been postponed many times (4+)
  // 2. Are much longer than available time
  // 3. Don't have imminent deadline
  const candidates = incompleteTasks.filter(t => {
    const hasDeadlineSoon = t.due_date && 
      new Date(t.due_date) <= new Date(new Date(context.currentDate).getTime() + 2 * 24 * 60 * 60 * 1000)
    
    return (
      t.postpone_count >= 4 &&
      t.estimate_min > context.availableMinutes * 0.5 &&
      !hasDeadlineSoon
    )
  })

  if (candidates.length === 0) return null

  const task = candidates[0]
  const tomorrow = new Date(context.currentDate)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const reasoning = [
    `Zadanie "${task.title}" było odkładane już ${task.postpone_count} razy`,
    `Wymaga ${task.estimate_min} min, a masz tylko ${context.availableMinutes} min`,
    'Lepiej zaplanować je na inny dzień z większą ilością czasu'
  ]

  const actions: ProposalAction[] = [
    {
      type: 'move_task',
      task_id: task.id,
      from_date: context.currentDate,
      to_date: tomorrow.toISOString().split('T')[0],
      reason: 'Not enough time today'
    }
  ]

  return {
    type: 'DEFER',
    title: `Przenieś "${task.title}" na jutro`,
    reasoning,
    confidence: 0.65,
    impact: 'MEDIUM',
    actions,
    expectedOutcome: {
      timeSaved: 0,
      stressReduction: 0.3,
      completionProbability: 0.6
    }
  }
}

/**
 * Detect if multiple recommendations conflict
 */
export function filterConflictingRecommendations(
  recommendations: SmartRecommendation[]
): SmartRecommendation[] {
  const taskIds = new Set<string>()
  const filtered: SmartRecommendation[] = []

  for (const rec of recommendations) {
    // Check if any task in this recommendation is already used
    const recTaskIds = rec.actions
      .map(a => a.task_id)
      .filter((id): id is string => id !== undefined)
    
    const hasConflict = recTaskIds.some(id => taskIds.has(id))
    
    if (!hasConflict) {
      filtered.push(rec)
      recTaskIds.forEach(id => taskIds.add(id))
    }
  }

  return filtered
}

/**
 * Format recommendation for display in chat
 */
export function formatRecommendationForChat(rec: SmartRecommendation): string {
  const impactEmoji = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢'
  }

  const confidencePercent = Math.round(rec.confidence * 100)

  let message = `${impactEmoji[rec.impact]} **${rec.title}**\n\n`
  
  rec.reasoning.forEach(reason => {
    message += `• ${reason}\n`
  })

  message += `\n*Pewność: ${confidencePercent}% | Wpływ: ${rec.impact}*\n`

  if (rec.expectedOutcome.timeSaved > 0) {
    message += `⏱️ Oszczędność czasu: ~${rec.expectedOutcome.timeSaved} min\n`
  }

  return message
}
