/**
 * Day Assistant v2 - Recommendation Engine
 * Implements scoring logic and live replanning with AI-powered recommendations
 * For advanced ML-inspired recommendations, see aiRecommendationEngine.ts
 */

import {
  TestDayTask,
  DayPlan,
  Proposal,
  ProposalAction,
  TaskScore,
  ScoreBreakdown,
  AssistantConfig,
  DEFAULT_SETTINGS,
  DetailedScoreBreakdown,
  ScoreFactor,
  WorkMode
} from '@/lib/types/dayAssistantV2'
import { createProposal, getTasks } from './dayAssistantV2Service'
import { 
  generateSmartRecommendations, 
  filterConflictingRecommendations,
  SmartRecommendation 
} from './aiRecommendationEngine'
import { getUserBehaviorProfile } from './behaviorLearningService'
import { getDefaultProfile } from './intelligentScoringEngine'
import {
  calculateTaskScore as calculateAdvancedTaskScore
} from './advancedTaskScoring'

// Scoring weights
const WEIGHTS = {
  priority: 10,
  deadline_proximity: 15,
  impact: 10,
  dependencies: 5,
  energy_focus_bonus: 20,
  avoidance_penalty: 25,
  postpone_base: 5,
  cognitive_load: 6 // Weight per cognitive load level (1-5) - emphasize mental effort after reports of load being ignored
}

// Constants
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24
const DEFAULT_ENERGY = 3
const DEFAULT_FOCUS = 3
const DEFAULT_COGNITIVE_LOAD = 2
const LOW_FOCUS_MAX_COGNITIVE_LOAD = 2  // Low focus mode shows tasks with cognitive load ≤ 2
const HYPERFOCUS_MIN_COGNITIVE_LOAD = 4  // Hyperfocus mode shows tasks with cognitive load ≥ 4
const QUICK_WIN_DURATION_MAX = 20  // Quick wins: tasks under 20 minutes
const SHORT_TASK_DURATION_MAX = 40  // Short tasks: tasks under 40 minutes
const QUICK_WIN_BONUS = 15  // Bonus points for quick win tasks (< 20 minutes)
const SHORT_TASK_BONUS = 5  // Bonus points for reasonably short tasks (< 40 minutes in standard mode)

/**
 * Get cognitive load explanation in Polish
 */
function getCognitiveLoadExplanation(load: number): string {
  if (load === 1) return 'Bardzo proste zadanie - szybkie do wykonania'
  if (load === 2) return 'Proste zadanie - niewielki wysiłek mentalny'
  if (load === 3) return 'Średnia złożoność - wymaga skupienia'
  if (load === 4) return 'Złożone zadanie - wymaga wysokiej koncentracji'
  if (load === 5) return 'Bardzo złożone - pełne zaangażowanie mentalne'
  return 'Nieznana złożoność'
}

/**
 * Map WorkMode to energy/focus values
 */
function mapWorkModeToEnergyFocus(workMode: WorkMode): { energy: number, focus: number } {
  switch (workMode) {
    case 'low_focus':
      return { energy: 2, focus: 2 } // Niska energia - łatwe zadania
    case 'hyperfocus':
      return { energy: 4, focus: 4 } // Wysoka energia - trudne zadania
    case 'quick_wins':
      return { energy: 3, focus: 3 } // Normalna energia - krótkie zadania
    case 'standard':
    default:
      return { energy: 3, focus: 3 } // Normalna praca
  }
}

/**
 * Type guard to validate WorkMode
 */
function isValidWorkMode(value: unknown): value is WorkMode {
  return typeof value === 'string' && ['low_focus', 'standard', 'hyperfocus', 'quick_wins'].includes(value)
}

/**
 * Calculate task score based on multiple factors with enhanced context grouping
 */
export function calculateTaskScore(
  task: TestDayTask,
  dayPlan: DayPlan,
  context: {
    todayDate: string
    totalTasksToday: number
    lightMinutesToday: number
    tasksAlreadyInQueue?: TestDayTask[]  // NEW: for context grouping
  }
): TaskScore & { reasoning?: string[] } {
  const breakdown: ScoreBreakdown = {
    base_score: 0,
    fit_bonus: 0,
    avoidance_penalty: 0,
    final_score: 0
  }
  const reasoning: string[] = []
  
  // 1. Base score: priority + deadline + impact
  const priorityScore = calculatePriorityScore(task.priority)
  breakdown.base_score += priorityScore
  // ALWAYS show priority in breakdown
  // App's internal model: priority=1 is P1 (highest), priority=4 is P4 (lowest)
  const priorityLabels: Record<number, string> = {
    1: 'P1',  // Highest
    2: 'P2',
    3: 'P3',
    4: 'P4'   // Lowest
  }
  const priorityLabel = priorityLabels[task.priority] || 'P3'
  reasoning.push(`🚩 Priorytet ${priorityLabel}: +${priorityScore}`)
  
  const deadlineScore = calculateDeadlineProximity(task.due_date, context.todayDate)
  breakdown.base_score += deadlineScore
  if (task.due_date) {
    if (task.due_date < context.todayDate) {
      reasoning.push(`🔴 PRZETERMINOWANE: +${deadlineScore}`)
    } else if (task.due_date === context.todayDate) {
      reasoning.push(`⏰ Deadline dziś: +${deadlineScore}`)
    } else {
      const daysUntil = Math.floor((new Date(task.due_date).getTime() - new Date(context.todayDate).getTime()) / MILLISECONDS_PER_DAY)
      if (daysUntil === 1) {
        reasoning.push(`⏰ Deadline jutro: +${deadlineScore}`)
      } else if (daysUntil <= 3) {
        reasoning.push(`📅 Deadline za ${daysUntil}d: +${deadlineScore}`)
      } else {
        // Show even if far in future
        reasoning.push(`📅 Deadline za ${daysUntil}d: +${deadlineScore}`)
      }
    }
  } else {
    // Show when no deadline
    reasoning.push(`📅 Brak deadline: +${deadlineScore}`)
  }
  
  const impactScore = calculateImpactScore(task)
  breakdown.base_score += impactScore
  if (task.is_must) {
    reasoning.push('📌 Przypięty (MUST): +' + (WEIGHTS.impact * 2))
  } else if (task.is_important) {
    reasoning.push('⭐ Ważny: +' + WEIGHTS.impact)
  } else {
    // Show even if not must or important
    reasoning.push('⭐ Znaczenie: +' + impactScore)
  }
  
  // 2. Energy/Focus fit bonus
  breakdown.fit_bonus = calculateEnergyFocusFit(
    dayPlan.energy,
    dayPlan.focus,
    task.cognitive_load,
    task.estimate_min,
    reasoning
  )
  
  // 3. Context grouping bonus (NEW!)
  const contextBonus = calculateContextGroupingBonus(
    task,
    context.tasksAlreadyInQueue || [],
    reasoning
  )
  breakdown.fit_bonus += contextBonus
  
  // 4. Estimate penalty
  const estimatePenalty = calculateEstimatePenalty(task.estimate_min, reasoning)
  breakdown.avoidance_penalty += estimatePenalty
  
  // 5. Avoidance penalty (postpone count)
  const postponePenalty = calculateAvoidancePenalty(
    task.postpone_count,
    context.lightMinutesToday
  )
  breakdown.avoidance_penalty += postponePenalty
  // ALWAYS show postpone penalty if there's any postpone count
  if (task.postpone_count > 0) {
    reasoning.push(`⏭️ Odkładane ${task.postpone_count}x: -${postponePenalty.toFixed(1)}`)
  }
  
  // 6. Tie-breaker for unique scores
  const tieBreaker = calculateTieBreaker(task)
  // Show tie-breaker (rounded to be meaningful)
  if (Math.abs(tieBreaker) > 0.01) {
    reasoning.push(`🎲 Tie-breaker: +${tieBreaker.toFixed(2)}`)
  }
  
  // 7. Final score
  breakdown.final_score = breakdown.base_score + breakdown.fit_bonus - breakdown.avoidance_penalty + tieBreaker
  
  return {
    task_id: task.id,
    score: breakdown.final_score,
    breakdown,
    reasoning
  }
}

/**
 * Priority score (App's internal model: 1=highest, 4=lowest)
 */
function calculatePriorityScore(priority: number): number {
  // Convert: P1(1) → 40 pts, P2(2) → 30 pts, P3(3) → 20 pts, P4(4) → 10 pts
  return (5 - priority) * WEIGHTS.priority
}

/**
 * Deadline proximity score (closer deadline = higher score)
 */
function calculateDeadlineProximity(dueDate: string | null | undefined, today: string): number {
  if (!dueDate) return 0
  
  const due = new Date(dueDate)
  const now = new Date(today)
  const daysUntil = Math.floor((due.getTime() - now.getTime()) / MILLISECONDS_PER_DAY)
  
  if (daysUntil < 0) return WEIGHTS.deadline_proximity * 2  // Overdue!
  if (daysUntil === 0) return WEIGHTS.deadline_proximity * 1.5  // Due today
  if (daysUntil === 1) return WEIGHTS.deadline_proximity  // Due tomorrow
  if (daysUntil <= 3) return WEIGHTS.deadline_proximity * 0.5
  
  return 0
}

/**
 * Impact score (is_important, is_must)
 */
function calculateImpactScore(task: TestDayTask): number {
  let score = 0
  if (task.is_must) score += WEIGHTS.impact * 2
  if (task.is_important) score += WEIGHTS.impact
  return score
}

/**
 * Energy/Focus fit bonus with reasoning
 * Tasks with matching cognitive load get higher scores
 */
function calculateEnergyFocusFit(
  energy: number,
  focus: number,
  cognitiveLoad: number,
  estimateMin: number,
  reasoning: string[]
): number {
  const avgState = (energy + focus) / 2
  
  // Perfect fit: cognitive load matches energy/focus state
  const fitDiff = Math.abs(avgState - cognitiveLoad)
  
  let fitScore = WEIGHTS.energy_focus_bonus * (1 - fitDiff / 5)
  const baseFitScore = fitScore
  
  // ALWAYS show energy/focus fit (not just for specific cases)
  if (fitDiff === 0) {
    reasoning.push(`⚡ Idealne dopasowanie energii (${energy}/5, focus ${focus}/5): +${Math.round(fitScore)}`)
  } else if (fitDiff === 1) {
    reasoning.push(`⚡ Dobre dopasowanie energii (${energy}/5, focus ${focus}/5): +${Math.round(fitScore)}`)
  } else if (fitDiff >= 3) {
    if (cognitiveLoad > avgState) {
      reasoning.push(`⚡ Za trudne dla obecnej energii (${energy}/5, focus ${focus}/5): +${Math.round(fitScore)}`)
    } else {
      reasoning.push(`⚡ Zbyt łatwe dla obecnej energii (${energy}/5, focus ${focus}/5): +${Math.round(fitScore)}`)
    }
  } else {
    // Handle remaining cases (typically fitDiff === 2, but can be any value not caught above)
    reasoning.push(`⚡ Dopasowanie energii (${energy}/5, focus ${focus}/5): +${Math.round(fitScore)}`)
  }
  
  // Bonus for short tasks when focus is low
  if (focus <= 2 && estimateMin <= 15) {
    fitScore += 10
    reasoning.push(`⚡ Bonus za krótkie zadanie przy niskim focus: +10`)
  }
  
  // Penalty for long tasks when focus is low
  if (focus <= 2 && estimateMin > 45) {
    fitScore -= 15
    reasoning.push(`⚡ Kara za długie zadanie przy niskim focus: -15`)
  }
  
  return Math.max(0, fitScore)
}

/**
 * Avoidance penalty (postpone count)
 */
function calculateAvoidancePenalty(
  postponeCount: number,
  lightMinutesToday: number
): number {
  let penalty = postponeCount * WEIGHTS.postpone_base
  
  // Escalation: if postponed 3+ times, reduce penalty to encourage completion
  if (postponeCount >= 3) {
    penalty = penalty * 0.5  // Make it more attractive to do now
  }
  
  return penalty
}

/**
 * Calculate context grouping bonus (NEW!)
 * Rewards continuing same context (flow state)
 * Penalizes context switches
 */
function calculateContextGroupingBonus(
  task: TestDayTask,
  tasksAlreadyInQueue: TestDayTask[],
  reasoning: string[]
): number {
  if (tasksAlreadyInQueue.length === 0) {
    reasoning.push(`🎭 Kontekst (${task.context_type || 'brak'}): +0 (pierwsze zadanie)`)
    return 0  // First task - no context to group with
  }
  
  // Count consecutive tasks with same context_type (from end of queue)
  let consecutiveCount = 0
  for (let i = tasksAlreadyInQueue.length - 1; i >= 0; i--) {
    if (tasksAlreadyInQueue[i].context_type === task.context_type && task.context_type) {
      consecutiveCount++
    } else {
      break  // Stop at first different context
    }
  }
  
  if (consecutiveCount > 0) {
    // Bonus for continuing same context (flow state!)
    const bonus = Math.min(consecutiveCount * 5, 15)  // +5 per task, max +15
    reasoning.push(`🎭 Kontynuacja ${task.context_type} (${consecutiveCount} pod rząd): +${bonus} (flow state)`)
    return bonus
  }
  
  // Check if this would break a context streak
  const lastTask = tasksAlreadyInQueue[tasksAlreadyInQueue.length - 1]
  if (lastTask && lastTask.context_type && task.context_type && lastTask.context_type !== task.context_type) {
    // Penalty for context switch
    reasoning.push(`🔄 Przełączenie kontekstu (${lastTask.context_type} → ${task.context_type}): -3`)
    return -3
  }
  
  // No context or same as last task but not consecutive
  reasoning.push(`🎭 Kontekst (${task.context_type || 'brak'}): +0`)
  return 0
}

/**
 * Calculate estimate penalty (NEW!)
 * Penalizes long tasks
 */
function calculateEstimatePenalty(estimateMin: number, reasoning: string[]): number {
  if (estimateMin <= 15) {
    reasoning.push(`⚡ Szybkie (${estimateMin}min): +0`)
    return 0
  } else if (estimateMin <= 30) {
    reasoning.push(`⏱ Średnie (${estimateMin}min): -3`)
    return 3
  } else if (estimateMin <= 60) {
    reasoning.push(`⏱ Długie (${estimateMin}min): -7`)
    return 7
  } else {
    reasoning.push(`⏱ Bardzo długie (${estimateMin}min): -15`)
    return 15
  }
}

/**
 * Calculate tie-breaker (NEW!)
 * Ensures unique scores for deterministic ordering
 */
function calculateTieBreaker(task: TestDayTask): number {
  // Use task ID + created_at for deterministic but unique tie-breaking
  const createdTimestamp = new Date(task.created_at).getTime()
  const idHash = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return ((createdTimestamp + idHash) % 1000) / 1000
}

/**
 * SCORING ALGORITHM V3 - Complete overhaul with new weights
 * Part of Day Assistant V2 Complete Overhaul
 * 
 * NOW ENHANCED with Advanced Task Scoring System:
 * - Uses time-based deadline scoring (0-150 points based on hours until due)
 * - Enhanced priority scoring (P1=50, P2=30, P3=10)
 * - Cognitive load as penalty (subtracted from score)
 * - Postpone bonus (instead of penalty) to prevent perpetual postponement
 */
export function calculateTaskScoreV3(
  task: TestDayTask,
  context: {
    todayDate: string
    workMode: WorkMode
    contextFilter: string | null
  }
): TaskScore & { reasoning: string[] } {
  let score = 0
  const reasoning: string[] = []
  
  // Get advanced scoring components
  const advancedScore = calculateAdvancedTaskScore(task)
  
  // 1. MUST task - highest priority (+50)
  if (task.is_must) {
    score += 50
    reasoning.push('📌 MUST przypięte: +50')
  }
  
  // 2. Deadline scoring (ENHANCED - now time-based, 0-150 points)
  const deadlineScore = advancedScore.breakdown.deadline
  score += deadlineScore
  
  if (task.due_date) {
    const now = new Date()
    const due = new Date(task.due_date)
    const hoursUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntil < 0) {
      reasoning.push(`🔴 PRZETERMINOWANE: +${deadlineScore}`)
    } else if (hoursUntil < 2) {
      reasoning.push(`⏰ Deadline za ${Math.round(hoursUntil)}h: +${deadlineScore}`)
    } else if (hoursUntil < 24) {
      reasoning.push(`⏰ Deadline dziś: +${deadlineScore}`)
    } else if (hoursUntil < 48) {
      reasoning.push(`📅 Deadline jutro: +${deadlineScore}`)
    } else {
      const daysUntil = Math.floor(hoursUntil / 24)
      reasoning.push(`📅 Deadline za ${daysUntil}d: +${deadlineScore}`)
    }
  } else {
    reasoning.push(`📅 Brak deadline: +${deadlineScore}`)
  }
  
  // 3. Priority scoring (ENHANCED - P1=50, P2=30, P3=10)
  const priorityScore = advancedScore.breakdown.priority
  score += priorityScore
  const priorityLabel = task.priority === 1 ? 'P1' : task.priority === 2 ? 'P2' : task.priority === 3 ? 'P3' : 'P4'
  reasoning.push(`🚩 Priorytet ${priorityLabel}: +${priorityScore}`)
  
  // 4. Cognitive load (ENHANCED - now as penalty, subtracted)
  // Note: advancedScore.breakdown.cognitiveLoad is already negative (e.g., -6)
  // We add it to the score (which effectively subtracts the penalty)
  const cogLoad = task.cognitive_load || DEFAULT_COGNITIVE_LOAD
  const cogLoadPenaltyValue = Math.abs(advancedScore.breakdown.cognitiveLoad)  // Convert to positive for display
  score += advancedScore.breakdown.cognitiveLoad  // Add negative value = subtract penalty
  
  // Also keep work mode matching bonus
  if (context.workMode === 'low_focus' && cogLoad <= LOW_FOCUS_MAX_COGNITIVE_LOAD) {
    score += 15
    reasoning.push(`🧠 Cognitive Load ${cogLoad}/5 (dopasowanie Low Focus): +15, penalty: ${advancedScore.breakdown.cognitiveLoad}`)
  } else if (context.workMode === 'hyperfocus' && cogLoad >= HYPERFOCUS_MIN_COGNITIVE_LOAD) {
    score += 15
    reasoning.push(`🧠 Cognitive Load ${cogLoad}/5 (dopasowanie HyperFocus): +15, penalty: ${advancedScore.breakdown.cognitiveLoad}`)
  } else {
    reasoning.push(`🧠 Cognitive Load ${cogLoad}/5: penalty ${advancedScore.breakdown.cognitiveLoad}`)
  }
  
  // 5. Postpone bonus (ENHANCED - now bonus instead of penalty)
  const postponeBonus = advancedScore.breakdown.postpone
  if (postponeBonus > 0) {
    score += postponeBonus
    reasoning.push(`⏭️ Odkładane ${task.postpone_count}x: +${postponeBonus} (bonus zapobiegający wiecznemu odkładaniu)`)
  }
  
  // 6. Context matching
  if (context.contextFilter && task.context_type === context.contextFilter) {
    score += 10
    reasoning.push(`📁 Kontekst ${task.context_type} (filtr aktywny): +10`)
  } else if (task.context_type) {
    reasoning.push(`📁 Kontekst ${task.context_type}: +0`)
  }
  
  // 7. Short task bonus (Standard mode or Quick Wins mode)
  if (context.workMode === 'quick_wins' && task.estimate_min < QUICK_WIN_DURATION_MAX) {
    // Quick wins mode: extra bonus for very short tasks
    score += QUICK_WIN_BONUS
    reasoning.push(`⚡ Quick Win (${task.estimate_min}min): +${QUICK_WIN_BONUS}`)
  } else if (context.workMode === 'standard' && task.estimate_min <= SHORT_TASK_DURATION_MAX) {
    // Standard mode: small bonus for reasonably short tasks
    score += SHORT_TASK_BONUS
    reasoning.push(`⏱ Krótkie zadanie (${task.estimate_min}min): +${SHORT_TASK_BONUS}`)
  } else {
    reasoning.push(`⏱ Czas ${task.estimate_min}min: +0`)
  }
  
  // 8. Long task penalty
  if (task.estimate_min > 90) {
    score -= 10
    reasoning.push(`⏱ Bardzo długie zadanie (${task.estimate_min}min): -10`)
  }
  
  const breakdown: ScoreBreakdown = {
    base_score: score,
    fit_bonus: 0,
    avoidance_penalty: 0,
    final_score: score
  }
  
  return {
    task_id: task.id,
    score,
    breakdown,
    reasoning
  }
}

/**
 * Score and sort tasks using V3 algorithm with work mode filtering
 */
export function scoreAndSortTasksV3(
  tasks: TestDayTask[],
  dayPlan: DayPlan,
  todayDate: string,
  contextFilter: string | null
): TestDayTask[] {
  const workMode = (dayPlan.metadata?.work_mode as WorkMode) || 'standard'
  
  // Filter by work mode FIRST
  let filteredTasks = tasks.filter(t => !t.completed)  // Always filter out completed tasks
  
  if (workMode === 'low_focus') {
    // Low focus mode: easy tasks only
    filteredTasks = filteredTasks.filter(t => (t.cognitive_load || DEFAULT_COGNITIVE_LOAD) <= LOW_FOCUS_MAX_COGNITIVE_LOAD)
  } else if (workMode === 'hyperfocus') {
    // Hyperfocus mode: hard tasks only
    filteredTasks = filteredTasks.filter(t => (t.cognitive_load || DEFAULT_COGNITIVE_LOAD) >= HYPERFOCUS_MIN_COGNITIVE_LOAD)
  } else if (workMode === 'quick_wins') {
    // Quick wins mode: short tasks only (< 20 minutes)
    filteredTasks = filteredTasks.filter(t => (t.estimate_min || 0) < QUICK_WIN_DURATION_MAX)
  }
  // Standard mode: no filtering by cognitive load or duration
  
  // Score tasks
  const scored = filteredTasks.map(task => {
    const scoreResult = calculateTaskScoreV3(task, {
      todayDate,
      workMode,
      contextFilter
    })
    
    return {
      ...task,
      metadata: {
        ...task.metadata,
        _score: scoreResult.score,
        _scoreReasoning: scoreResult.reasoning
      }
    }
  })
  
  // Sort by score (highest first), then MUST tasks on top
  scored.sort((a, b) => {
    if (a.is_must && !b.is_must) return -1
    if (!a.is_must && b.is_must) return 1
    return (b.metadata._score || 0) - (a.metadata._score || 0)
  })
  
  return scored
}

/**
 * Generate recommendation when user adds a task with "today" flag
 */
export async function generateTaskAddedRecommendation(
  userId: string,
  assistantId: string,
  assistant: AssistantConfig,
  newTaskId: string,
  allTasks: TestDayTask[],
  dayPlan: DayPlan,
  date: string
): Promise<Proposal | null> {
  // Score all tasks
  const scores = allTasks.map(task => 
    calculateTaskScore(task, dayPlan, {
      todayDate: date,
      totalTasksToday: allTasks.length,
      lightMinutesToday: 0  // TODO: calculate from completed tasks
    })
  )
  
  // Find lowest scoring non-MUST task as candidate for moving
  const nonMustTasks = allTasks.filter(t => !t.is_must && t.id !== newTaskId)
  const nonMustScores = scores.filter(s => nonMustTasks.some(t => t.id === s.task_id))
  
  if (nonMustScores.length === 0) {
    // No tasks to move - all are MUST or only the new task exists
    return null
  }
  
  const lowestScore = nonMustScores.reduce((min, s) => s.score < min.score ? s : min)
  const taskToMove = allTasks.find(t => t.id === lowestScore.task_id)!
  const newTask = allTasks.find(t => t.id === newTaskId)!
  
  // Calculate tomorrow's date
  const tomorrow = new Date(date)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  // Create primary action: move lowest scoring task to tomorrow
  const primaryAction: ProposalAction = {
    type: 'move_task',
    task_id: taskToMove.id,
    from_date: date,
    to_date: tomorrowStr
  }
  
  // Create alternatives
  const alternatives: ProposalAction[] = []
  
  // Alternative 1: Move the new task to tomorrow instead
  alternatives.push({
    type: 'move_task',
    task_id: newTaskId,
    from_date: date,
    to_date: tomorrowStr
  })
  
  // Alternative 2: Decompose new task if it's long
  if (newTask.estimate_min > (assistant.settings?.auto_decompose_threshold || 60)) {
    alternatives.push({
      type: 'decompose_task',
      task_id: newTaskId,
      metadata: { target_duration: 25 }
    })
  }
  
  // Generate reason
  const reason = generateTaskAddedReason(newTask, taskToMove, lowestScore.score)
  
  // Create and return proposal
  return await createProposal(
    userId,
    assistantId,
    date,
    reason,
    primaryAction,
    alternatives
  )
}

/**
 * Generate reason text for task added recommendation
 */
function generateTaskAddedReason(newTask: TestDayTask, taskToMove: TestDayTask, moveScore: number): string {
  const reasons: string[] = []
  
  reasons.push(`Dodałeś zadanie "${newTask.title}" na dziś.`)
  
  if (taskToMove.is_important) {
    reasons.push(`Proponuję przesunąć "${taskToMove.title}" na jutro, bo ma niższy priorytet.`)
  } else if (taskToMove.postpone_count > 0) {
    reasons.push(`Proponuję przesunąć "${taskToMove.title}" na jutro (było już przenoszone ${taskToMove.postpone_count}x).`)
  } else {
    reasons.push(`Proponuję przesunąć "${taskToMove.title}" na jutro, żeby zrobić miejsce.`)
  }
  
  if (newTask.due_date) {
    const due = new Date(newTask.due_date)
    const today = new Date()
    const daysUntil = Math.floor((due.getTime() - today.getTime()) / MILLISECONDS_PER_DAY)
    if (daysUntil === 0) {
      reasons.push('Nowe zadanie ma deadline dziś.')
    }
  }
  
  return reasons.join(' ')
}

/**
 * Generate recommendation when user clicks "Nie dziś"
 */
export async function generatePostponeRecommendation(
  userId: string,
  assistantId: string,
  assistant: AssistantConfig,
  task: TestDayTask,
  date: string
): Promise<Proposal | null> {
  const tomorrow = new Date(date)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  // Check if escalation is needed (postponed 3+ times)
  if (task.postpone_count >= (assistant.settings?.max_postpones_before_escalation || 3)) {
    // Escalate: reserve morning slot
    const primaryAction: ProposalAction = {
      type: 'reserve_morning',
      task_id: task.id,
      to_date: tomorrowStr,
      metadata: {
        duration: assistant.settings?.morning_must_block_default || 30,
        time: '08:00'
      }
    }
    
    const alternatives: ProposalAction[] = [
      {
        type: 'decompose_task',
        task_id: task.id,
        metadata: { target_duration: 25 }
      }
    ]
    
    const reason = `Przeniosłeś to zadanie już ${task.postpone_count} razy. Chcesz, żebym zarezerwował 30 min jutro rano?`
    
    return await createProposal(
      userId,
      assistantId,
      tomorrowStr,
      reason,
      primaryAction,
      alternatives
    )
  }
  
  // Normal postpone - no additional recommendation needed
  // The postpone action itself is sufficient
  return null
}

/**
 * Check if light task limit exceeded
 */
export function checkLightTaskLimit(
  completedTasks: TestDayTask[],
  assistant: AssistantConfig
): { exceeded: boolean; minutes: number; limit: number } {
  const lightTasks = completedTasks.filter(t => t.cognitive_load <= 2)
  const lightMinutes = lightTasks.reduce((sum, t) => sum + t.estimate_min, 0)
  const limit = assistant.settings?.light_task_limit_minutes || DEFAULT_SETTINGS.light_task_limit_minutes!
  
  return {
    exceeded: lightMinutes >= limit,
    minutes: lightMinutes,
    limit
  }
}

/**
 * Generate soft warning for unmarking MUST task
 */
export function generateUnmarkMustWarning(task: TestDayTask): {
  title: string
  message: string
  details: string[]
} {
  const details: string[] = []
  
  if (task.due_date) {
    const due = new Date(task.due_date)
    const today = new Date()
    const daysUntil = Math.floor((due.getTime() - today.getTime()) / MILLISECONDS_PER_DAY)
    if (daysUntil === 0) {
      details.push('Ma deadline dziś')
    } else if (daysUntil === 1) {
      details.push('Ma deadline jutro')
    }
  }
  
  if (task.is_important) {
    details.push('Jest oznaczone jako ważne')
  }
  
  if (task.postpone_count > 0) {
    details.push(`Było przenoszone ${task.postpone_count} razy`)
  }
  
  const message = details.length > 0
    ? `Uwaga: ${details.join(', ')}.`
    : 'To zadanie było oznaczone jako MUST.'
  
  return {
    title: 'Odznaczyć zadanie jako MUST?',
    message,
    details
  }
}

/**
 * Score and sort tasks by intelligent algorithm with iterative context awareness
 * Used by useScoredTasks hook in the UI
 */
export function scoreAndSortTasks(
  tasks: TestDayTask[],
  dayPlan: DayPlan,
  todayDate: string
): TestDayTask[] {
  // Map WorkMode to energy/focus if available and valid
  const workModeValue = dayPlan.metadata?.work_mode
  const workMode = isValidWorkMode(workModeValue) ? workModeValue : undefined
  const energyFocus = workMode 
    ? mapWorkModeToEnergyFocus(workMode)
    : { energy: dayPlan.energy ?? DEFAULT_ENERGY, focus: dayPlan.focus ?? DEFAULT_FOCUS }
  
  // Create adjusted dayPlan with mapped energy/focus
  const adjustedDayPlan: DayPlan = {
    ...dayPlan,
    energy: energyFocus.energy,
    focus: energyFocus.focus
  }
  
  // Separate into date categories first
  const today = todayDate
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today)
  const dueTodayTasks = tasks.filter(t => t.due_date === today)
  const inboxTasks = tasks.filter(t => !t.due_date)
  const futureTasks = tasks.filter(t => t.due_date && t.due_date > today)
  
  // Score tasks iteratively (each task knows about tasks scored before it)
  const scoreTasksWithContext = (taskList: TestDayTask[], alreadyScored: TestDayTask[]) => {
    const scored: Array<{ task: TestDayTask; score: any }> = []
    
    for (const task of taskList) {
      const scoreResult = calculateTaskScore(task, adjustedDayPlan, {
        todayDate,
        totalTasksToday: tasks.length,
        lightMinutesToday: 0,
        tasksAlreadyInQueue: [...alreadyScored, ...scored.map(s => s.task)]
      })
      
      scored.push({
        task: {
          ...task,
          // Attach score metadata for UI display
          metadata: {
            ...task.metadata,
            _score: scoreResult.score,
            _scoreReasoning: scoreResult.reasoning || []
          }
        },
        score: scoreResult
      })
    }
    
    // Sort by score (highest first)
    scored.sort((a, b) => b.score.score - a.score.score)
    return scored.map(s => s.task)
  }
  
  // Score each category with context awareness
  const scoredOverdue = scoreTasksWithContext(overdueTasks, [])
  const scoredToday = scoreTasksWithContext(dueTodayTasks, scoredOverdue)
  const scoredInbox = scoreTasksWithContext(inboxTasks, [...scoredOverdue, ...scoredToday])
  const scoredFuture = scoreTasksWithContext(futureTasks, [...scoredOverdue, ...scoredToday, ...scoredInbox])
  
  // Return in priority order: overdue > today > inbox > future
  return [
    ...scoredOverdue,
    ...scoredToday,
    ...scoredInbox,
    ...scoredFuture
  ]
}

/**
 * Generate AI-powered smart recommendations for current context
 * This integrates with the aiRecommendationEngine for ML-inspired suggestions
 */
export async function generateAISmartRecommendations(
  userId: string,
  tasks: TestDayTask[],
  dayPlan: DayPlan,
  date: string
): Promise<SmartRecommendation[]> {
  try {
    // Get user behavior profile
    const profile = await getUserBehaviorProfile(userId)
    if (!profile) {
      // Use default profile for new users
      const defaultProfile = getDefaultProfile(userId)
      
      // Generate recommendations with default profile
      const recommendations = generateSmartRecommendations(
        tasks,
        dayPlan,
        defaultProfile,
        {
          currentDate: date,
          currentHour: new Date().getHours(),
          availableMinutes: calculateAvailableMinutesForAI(dayPlan)
        }
      )

      return filterConflictingRecommendations(recommendations)
    }

    // Generate recommendations with user profile
    const recommendations = generateSmartRecommendations(
      tasks,
      dayPlan,
      profile,
      {
        currentDate: date,
        currentHour: new Date().getHours(),
        availableMinutes: calculateAvailableMinutesForAI(dayPlan)
      }
    )

    return filterConflictingRecommendations(recommendations)
  } catch (error) {
    console.error('[RecommendationEngine] Error generating AI recommendations:', error)
    return []
  }
}

/**
 * Helper to calculate available minutes for AI recommendations
 */
function calculateAvailableMinutesForAI(dayPlan: DayPlan): number {
  const workEndTime = dayPlan.metadata?.work_end_time as string | undefined
  
  if (!workEndTime) {
    return 8 * 60 // Default 8 hours
  }

  const now = new Date()
  const [hours, minutes] = workEndTime.split(':').map(Number)
  const workEnd = new Date()
  workEnd.setHours(hours, minutes, 0, 0)

  if (workEnd <= now) {
    return 0
  }

  const diffMs = workEnd.getTime() - now.getTime()
  return Math.floor(diffMs / 1000 / 60)
}

/**
 * Calculate detailed score breakdown for tooltip display
 * This provides human-readable explanation of why a task is at its queue position
 */
export function calculateScoreBreakdown(
  task: TestDayTask,
  context: { energy: number; focus: number; context: string | null },
  todayDate: string,
  queuePosition?: number
): DetailedScoreBreakdown {
  const factors: ScoreFactor[] = []
  
  // 1. Energy match
  const energyDiff = Math.abs(task.cognitive_load - context.energy)
  const energyScore = Math.max(0, 30 - (energyDiff * 10))
  let energyExplanation = ''
  if (energyDiff === 0) {
    energyExplanation = 'Idealne dopasowanie do Twojej energii!'
  } else if (energyDiff === 1) {
    energyExplanation = 'Bardzo dobre dopasowanie energii'
  } else if (energyDiff >= 3) {
    energyExplanation = task.cognitive_load > context.energy 
      ? 'Może być trudne przy Twojej obecnej energii'
      : 'Może być zbyt proste, łatwo się znudzić'
  }
  
  factors.push({
    name: 'Dopasowanie energii',
    points: energyScore,
    positive: energyScore > 15,
    detail: `Load ${task.cognitive_load} vs Twoja energia: ${context.energy}`,
    explanation: energyExplanation
  })
  
  // 2. Priority
  let priorityScore = 0
  let priorityDetail = ''
  let priorityExplanation = ''
  // App's internal model: priority=1 is P1 (highest), priority=4 is P4 (lowest)
  const priorityLabels: Record<number, string> = {
    1: 'P1',  // Highest
    2: 'P2',
    3: 'P3',
    4: 'P4'   // Lowest
  }
  if (task.is_must) {
    priorityScore = 30
    priorityDetail = '📌 MUST - Przypięte'
    priorityExplanation = 'Oznaczone jako obowiązkowe na dziś'
  } else if (task.is_important) {
    priorityScore = 25
    priorityDetail = '⭐ Ważny'
    priorityExplanation = 'Wysokie znaczenie dla Twoich celów'
  } else if (task.priority <= 2) {
    priorityScore = 15
    const priorityLabel = priorityLabels[task.priority] || 'P3'
    priorityDetail = `Priorytet ${priorityLabel}`
    priorityExplanation = task.priority === 1 ? 'Najwyższy priorytet' : 'Wysoki priorytet'
  } else {
    priorityScore = (5 - task.priority) * 5
    const priorityLabel = priorityLabels[task.priority] || 'P3'
    priorityDetail = task.priority === 4 ? 'Brak priorytetu' : `Priorytet ${priorityLabel}`
    priorityExplanation = 'Normalny priorytet'
  }
  
  factors.push({
    name: 'Priorytet',
    points: priorityScore,
    positive: priorityScore > 10,
    detail: priorityDetail,
    explanation: priorityExplanation
  })
  
  // 3. Deadline urgency
  let deadlineScore = 0
  let deadlineDetail = 'Brak deadline'
  let deadlineExplanation = ''
  
  if (task.due_date) {
    // Try to get time from metadata if available
    const dueTime = (task.metadata as any)?.due_time || '23:59'
    
    if (task.due_date < todayDate) {
      const daysOverdue = Math.floor((new Date(todayDate).getTime() - new Date(task.due_date).getTime()) / MILLISECONDS_PER_DAY)
      deadlineScore = 25 // Overdue = high urgency
      deadlineDetail = `🔴 Przeterminowane ${daysOverdue}d`
      deadlineExplanation = 'Już minął termin - powinno być zrobione!'
    } else if (task.due_date === todayDate) {
      deadlineScore = 20 // Due today
      deadlineDetail = `⏰ Deadline dziś o ${dueTime}`
      const now = new Date()
      const [hours, minutes] = dueTime.split(':').map(Number)
      const deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
      const hoursLeft = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)))
      deadlineExplanation = hoursLeft <= 3 
        ? `Zostało ${hoursLeft}h - bardzo pilne!`
        : `Zostało ${hoursLeft}h - zrób dziś`
    } else {
      const daysUntil = Math.floor((new Date(task.due_date).getTime() - new Date(todayDate).getTime()) / MILLISECONDS_PER_DAY)
      if (daysUntil === 1) {
        deadlineScore = 15
        deadlineDetail = '📅 Deadline jutro'
        deadlineExplanation = 'Jutro już koniec - lepiej zrobić dziś'
      } else {
        deadlineScore = 10
        deadlineDetail = `📅 Deadline za ${daysUntil}d`
        deadlineExplanation = 'Masz jeszcze czas, ale warto zacząć'
      }
    }
  }
  
  factors.push({
    name: 'Deadline',
    points: deadlineScore,
    positive: deadlineScore > 15,
    detail: deadlineDetail,
    explanation: deadlineExplanation
  })
  
  // 4. Estimate penalty
  if (task.estimate_min > 60) {
    const estimatePenalty = -Math.min(Math.floor((task.estimate_min - 60) / 30) * 3, 10)
    factors.push({
      name: 'Czas trwania',
      points: estimatePenalty,
      positive: false,
      detail: `Długie zadanie (${task.estimate_min}min)`,
      explanation: 'Dłuższe zadania mają niższy priorytet (można je podzielić na mniejsze)'
    })
  } else if (task.estimate_min <= 15) {
    factors.push({
      name: 'Czas trwania',
      points: 5,
      positive: true,
      detail: `Szybkie zadanie (${task.estimate_min}min)`,
      explanation: 'Szybkie zwycięstwo - łatwe momentum!'
    })
  }
  
  // 5. Postpone penalty
  if (task.postpone_count > 0) {
    const postponePenalty = -Math.min(task.postpone_count * 5, 20)
    factors.push({
      name: 'Historia odkładania',
      points: postponePenalty,
      positive: false,
      detail: `Przełożone ${task.postpone_count}x`,
      explanation: task.postpone_count >= 3 
        ? 'Często odkładane - może warto je w końcu zrobić lub usunąć?'
        : 'Odkładane - nie pozwól aby rosło dalej'
    })
  }
  
  // 6. Context match
  let contextScore = 0
  let contextDetail = ''
  let contextExplanation = ''
  if (context.context && task.context_type === context.context) {
    contextScore = 22
    contextDetail = `✅ Pasuje do filtru: ${task.context_type}`
    contextExplanation = 'Idealny kontekst do tego co teraz robisz'
  } else if (!context.context) {
    contextScore = 10 // Neutral if no filter
    contextDetail = `Kontekst: ${task.context_type || 'brak'}`
  } else {
    contextScore = 5
    contextDetail = `🔄 Zmiana kontekstu (${context.context} → ${task.context_type})`
    contextExplanation = 'Przełączenie między różnymi typami pracy może zająć więcej czasu'
  }
  
  factors.push({
    name: 'Kontekst',
    points: contextScore,
    positive: contextScore > 15,
    detail: contextDetail,
    explanation: contextExplanation
  })
  
  // 7. Cognitive Load (NEW!)
  const cognitiveLoad = task.cognitive_load ?? DEFAULT_COGNITIVE_LOAD
  const cognitiveLoadScore = cognitiveLoad * WEIGHTS.cognitive_load
  factors.push({
    name: '🧠 Cognitive Load',
    points: cognitiveLoadScore,
    positive: false, // Neutral - cognitive load is informational, not inherently positive
    detail: `Złożoność zadania: ${cognitiveLoad}/5`,
    explanation: getCognitiveLoadExplanation(cognitiveLoad)
  })
  
  // 8. Freshness bonus removed - promotes procrastination for ADHD users
  
  const total = factors.reduce((sum, f) => sum + f.points, 0)
  
  // Generate summary based on position and factors
  let summary = ''
  if (queuePosition === 1) {
    summary = '🏆 To zadanie jest najważniejsze dziś - zacznij od niego!'
    const topFactor = factors.reduce((max, f) => f.points > max.points ? f : max, factors[0])
    if (topFactor) {
      summary += ` Główny powód: ${topFactor.detail}`
    }
  } else if (task.is_must) {
    summary = '📌 Przypięte zadanie - musisz je zrobić dziś'
  } else if (task.due_date === todayDate) {
    summary = '⏰ Ma deadline dziś - warto zrobić wcześniej'
  } else if (total > 60) {
    summary = '✨ Wysokie dopasowanie - dobre zadanie na teraz'
  } else if (total < 40) {
    summary = '💤 Słabe dopasowanie - może lepiej później lub gdy zmieni się kontekst'
  }
  
  return {
    total: Math.max(0, Math.min(100, total)),
    factors,
    explanation: generateExplanation(factors, total),
    summary
  }
}

/**
 * Generate explanation text based on score factors
 */
function generateExplanation(factors: ScoreFactor[], total: number): string {
  if (total > 80) return 'Świetne dopasowanie do Twojej obecnej energii i priorytetów!'
  if (total > 60) return 'Dobre dopasowanie - polecam zacząć od tego zadania.'
  if (total > 40) return 'Średnie dopasowanie - możesz zrobić teraz lub później.'
  return 'Słabe dopasowanie - lepiej zostawić na później lub zmienić parametry.'
}

/**
 * Helper function to get tomorrow's date in ISO format
 */
function getTomorrow(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

/**
 * Generate time-aware recommendation based on current context and available time
 * This addresses ISSUE 1: Only suggests postponing when > 90% time utilized
 */
export function generateRecommendation(
  tasks: TestDayTask[],
  context: {
    energy: number
    focus: number
    currentTime: Date
    workStartTime: string  // "09:00"
    workEndTime: string    // "17:00"
    contextFilter: string | null
  }
): Proposal | null {
  if (tasks.length === 0) return null
  
  // ========================================
  // CRITICAL: LOW ENERGY + LOW FOCUS
  // ========================================
  if (context.energy === 1 && context.focus === 1) {
    // Find easiest task (lowest cognitive load + shortest duration)
    const easiestTask = tasks
      .filter(t => t.cognitive_load <= 2)
      .sort((a, b) => {
        // Prefer: low cognitive load + short duration
        const scoreA = a.cognitive_load + (a.estimate_min / 100)
        const scoreB = b.cognitive_load + (b.estimate_min / 100)
        return scoreA - scoreB
      })[0]

    if (easiestTask && tasks[0] && easiestTask.id !== tasks[0].id) {
      return {
        id: `low-energy-focus-${easiestTask.id}-${Date.now()}`,
        user_id: easiestTask.user_id,
        assistant_id: easiestTask.assistant_id,
        plan_date: new Date().toISOString().split('T')[0],
        reason: `🟡 Niska energia i skupienie - zacznij od najłatwiejszego zadania "${easiestTask.title}" (Load ${easiestTask.cognitive_load}, ${easiestTask.estimate_min} min) żeby w ogóle ruszyć!`,
        primary_action: {
          type: 'reorder',
          task_id: easiestTask.id,
          metadata: {
            new_position: 1,
            reason: 'Start od łatwego zadania da Ci momentum'
          }
        },
        alternatives: [
          {
            type: 'suggest_break',
            metadata: {
              duration_minutes: 10,
              reason: 'Lub zrób krótką przerwę (10 min) i wróć z większą energią'
            }
          }
        ],
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }
    } else if (!easiestTask) {
      // No easy tasks - suggest break
      return {
        id: `suggest-break-${Date.now()}`,
        user_id: tasks[0].user_id,
        assistant_id: tasks[0].assistant_id,
        plan_date: new Date().toISOString().split('T')[0],
        reason: `🟡 Niska energia i skupienie, a wszystkie zadania wymagające. Weź krótką przerwę żeby się zregenerować.`,
        primary_action: {
          type: 'suggest_break',
          metadata: {
            duration_minutes: 15,
            reason: 'Przerwa pomoże Ci odzyskać energię'
          }
        },
        alternatives: [],
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }
    }
  }
  
  // STEP 1: Calculate available time
  const now = new Date()
  const [endHour, endMin] = context.workEndTime.split(':').map(Number)
  const workEnd = new Date()
  workEnd.setHours(endHour, endMin, 0, 0)
  
  const availableMinutes = Math.max(0, (workEnd.getTime() - now.getTime()) / 1000 / 60)
  
  // STEP 2: Calculate total estimated time
  const totalEstimatedTime = tasks.reduce((sum, t) => sum + t.estimate_min, 0)
  const utilizationPercent = availableMinutes > 0 ? (totalEstimatedTime / availableMinutes) * 100 : 100
  
  console.log('[Recommendation] Available:', Math.round(availableMinutes), 'min')
  console.log('[Recommendation] Estimated:', totalEstimatedTime, 'min')
  console.log('[Recommendation] Utilization:', utilizationPercent.toFixed(0), '%')
  
  // STEP 3: Only suggest postponing if > 90% utilized
  if (utilizationPercent > 90) {
    const candidatesToPostpone = tasks
      .filter(t => !t.is_must)
      .filter(t => t.cognitive_load <= 3)
      .sort((a, b) => {
        if (a.is_important !== b.is_important) return a.is_important ? 1 : -1
        return a.priority - b.priority
      })
    
    const taskToPostpone = candidatesToPostpone[0]
    
    if (taskToPostpone) {
      return {
        id: `postpone-${taskToPostpone.id}-${Date.now()}`,
        user_id: taskToPostpone.user_id,
        assistant_id: taskToPostpone.assistant_id,
        plan_date: new Date().toISOString().split('T')[0],
        reason: `Masz ${Math.round(availableMinutes)} min dostępnych, a tasków na ${totalEstimatedTime} min (${utilizationPercent.toFixed(0)}% wykorzystania). Proponuję przesunąć "${taskToPostpone.title}" na jutro.`,
        primary_action: {
          type: 'move_task',
          task_id: taskToPostpone.id,
          from_date: new Date().toISOString().split('T')[0],
          to_date: getTomorrow(),
          metadata: {
            reason: 'Za dużo tasków na dzisiaj'
          }
        },
        alternatives: [],
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        created_at: new Date().toISOString(),
      }
    }
  }
  
  // STEP 4: If < 70% utilized - NO postpone recommendation
  if (utilizationPercent < 70) {
    console.log('[Recommendation] Plenty of time, no postpone needed')
  }
  
  // STEP 5: Energy/focus based recommendations
  const topTask = tasks[0]
  
  // LOW FOCUS (1) + HIGH COGNITIVE LOAD
  if (context.focus === 1 && topTask.cognitive_load >= 4) {
    return {
      id: `low-focus-${topTask.id}-${Date.now()}`,
      user_id: topTask.user_id,
      assistant_id: topTask.assistant_id,
      plan_date: new Date().toISOString().split('T')[0],
      reason: `Przy niskim skupieniu task "${topTask.title}" (Load ${topTask.cognitive_load}) może być zbyt trudny.`,
      primary_action: {
        type: 'move_task',
        task_id: topTask.id,
        from_date: new Date().toISOString().split('T')[0],
        to_date: getTomorrow(),
        metadata: {
          reason: 'Niskie skupienie - lepiej przełożyć'
        }
      },
      alternatives: [],
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    }
  }
  
  // HIGH FOCUS (5) - suggest hardest task first
  if (context.focus === 5) {
    const hardestTask = tasks
      .filter(t => t.cognitive_load >= 4)
      .sort((a, b) => b.cognitive_load - a.cognitive_load)[0]
    
    if (hardestTask && hardestTask.id !== topTask.id) {
      return {
        id: `high-focus-${hardestTask.id}-${Date.now()}`,
        user_id: hardestTask.user_id,
        assistant_id: hardestTask.assistant_id,
        plan_date: new Date().toISOString().split('T')[0],
        reason: `Wysokie skupienie - idealny moment na "${hardestTask.title}" (Load ${hardestTask.cognitive_load})!`,
        primary_action: {
          type: 'reorder',
          task_id: hardestTask.id,
          metadata: {
            new_position: 1,
            reason: 'Wykorzystaj wysokie skupienie'
          }
        },
        alternatives: [],
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }
    }
  }
  
  // LOW ENERGY (1) - suggest easy task
  if (context.energy === 1) {
    const easiestTask = tasks
      .filter(t => t.cognitive_load <= 2)
      .sort((a, b) => a.cognitive_load - b.cognitive_load)[0]
    
    if (easiestTask && easiestTask.id !== topTask.id) {
      return {
        id: `low-energy-${easiestTask.id}-${Date.now()}`,
        user_id: easiestTask.user_id,
        assistant_id: easiestTask.assistant_id,
        plan_date: new Date().toISOString().split('T')[0],
        reason: `Niska energia - lepiej "${easiestTask.title}" (Load ${easiestTask.cognitive_load}).`,
        primary_action: {
          type: 'reorder',
          task_id: easiestTask.id,
          metadata: {
            new_position: 1,
            reason: 'Dostosuj do niskiej energii'
          }
        },
        alternatives: [],
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }
    }
  }
  
  // ========================================
  // CONTEXT BATCHING
  // ========================================
  // Note: topTask already defined above
  
  if (topTask && topTask.context_type) {
    // Find tasks with same context
    const sameContextTasks = tasks.filter(t => 
      t.context_type === topTask.context_type &&
      t.id !== topTask.id
    )

    if (sameContextTasks.length >= 2) {
      // Check if batching is safe
      const batchTotalTime = [topTask, ...sameContextTasks.slice(0, 2)]
        .reduce((sum, t) => sum + t.estimate_min, 0)

      // Calculate available time
      const now = new Date()
      const [endHour, endMin] = context.workEndTime.split(':').map(Number)
      const workEnd = new Date()
      workEnd.setHours(endHour, endMin, 0, 0)
      const availableMinutes = Math.max(0, (workEnd.getTime() - now.getTime()) / 1000 / 60)

      // Check if any task is a meeting scheduled soon
      const hasMeetingSoon = tasks.some(t => 
        t.title.toLowerCase().includes('spotkanie') ||
        t.title.toLowerCase().includes('meeting')
      )

      // Only suggest batching if:
      // - Batch fits in available time (with 30% buffer)
      // - No meeting soon
      // - Batch is < 2 hours (avoid too long context switching)
      if (
        batchTotalTime <= availableMinutes * 0.7 &&
        !hasMeetingSoon &&
        batchTotalTime <= 120
      ) {
        const batchTaskNames = [topTask, ...sameContextTasks.slice(0, 2)]
          .map(t => `"${t.title}"`)
          .join(', ')

        return {
          id: `context-batch-${topTask.id}-${Date.now()}`,
          user_id: topTask.user_id,
          assistant_id: topTask.assistant_id,
          plan_date: new Date().toISOString().split('T')[0],
          reason: `🎯 Masz ${sameContextTasks.length + 1} zadania kontekstu "${topTask.context_type}": ${batchTaskNames}. Zrobić je w jednym bloku (${batchTotalTime} min) żeby nie tracić kontekstu?`,
          primary_action: {
            type: 'create_batch',
            metadata: {
              task_ids: [topTask.id, ...sameContextTasks.slice(0, 2).map(t => t.id)],
              reason: 'Praca w jednym kontekście zwiększa efektywność'
            }
          },
          alternatives: [
            {
              type: 'keep_current_order',
              metadata: {
                reason: 'Lub zachowaj obecną kolejność (mieszane konteksty)'
              }
            }
          ],
          status: 'pending',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        }
      }
    }
  }
  
  return null
}
