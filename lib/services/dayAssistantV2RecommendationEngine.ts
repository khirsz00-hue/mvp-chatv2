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
  DEFAULT_SETTINGS
} from '@/lib/types/dayAssistantV2'
import { createProposal, getTasks } from './dayAssistantV2Service'
import { 
  generateSmartRecommendations, 
  filterConflictingRecommendations,
  SmartRecommendation 
} from './aiRecommendationEngine'
import { getUserBehaviorProfile } from './behaviorLearningService'
import { getDefaultProfile } from './intelligentScoringEngine'

// Scoring weights
const WEIGHTS = {
  priority: 10,
  deadline_proximity: 15,
  impact: 10,
  dependencies: 5,
  energy_focus_bonus: 20,
  avoidance_penalty: 25,
  postpone_base: 5
}

/**
 * Calculate task score based on multiple factors
 */
export function calculateTaskScore(
  task: TestDayTask,
  dayPlan: DayPlan,
  context: {
    todayDate: string
    totalTasksToday: number
    lightMinutesToday: number
  }
): TaskScore {
  const breakdown: ScoreBreakdown = {
    base_score: 0,
    fit_bonus: 0,
    avoidance_penalty: 0,
    final_score: 0
  }
  
  // 1. Base score: priority + deadline + impact
  breakdown.base_score += calculatePriorityScore(task.priority)
  breakdown.base_score += calculateDeadlineProximity(task.due_date, context.todayDate)
  breakdown.base_score += calculateImpactScore(task)
  
  // 2. Energy/Focus fit bonus
  breakdown.fit_bonus = calculateEnergyFocusFit(
    dayPlan.energy,
    dayPlan.focus,
    task.cognitive_load,
    task.estimate_min
  )
  
  // 3. Avoidance penalty (postpone count)
  breakdown.avoidance_penalty = calculateAvoidancePenalty(
    task.postpone_count,
    context.lightMinutesToday
  )
  
  // 4. Final score
  breakdown.final_score = breakdown.base_score + breakdown.fit_bonus - breakdown.avoidance_penalty
  
  return {
    task_id: task.id,
    score: breakdown.final_score,
    breakdown
  }
}

/**
 * Priority score (Todoist priority: 1=lowest, 4=highest)
 */
function calculatePriorityScore(priority: number): number {
  return priority * WEIGHTS.priority
}

/**
 * Deadline proximity score (closer deadline = higher score)
 */
function calculateDeadlineProximity(dueDate: string | null | undefined, today: string): number {
  if (!dueDate) return 0
  
  const due = new Date(dueDate)
  const now = new Date(today)
  const daysUntil = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
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
 * Energy/Focus fit bonus
 * Tasks with matching cognitive load get higher scores
 */
function calculateEnergyFocusFit(
  energy: number,
  focus: number,
  cognitiveLoad: number,
  estimateMin: number
): number {
  const avgState = (energy + focus) / 2
  
  // Perfect fit: cognitive load matches energy/focus state
  const fitDiff = Math.abs(avgState - cognitiveLoad)
  
  let fitScore = WEIGHTS.energy_focus_bonus * (1 - fitDiff / 5)
  
  // Bonus for short tasks when focus is low
  if (focus <= 2 && estimateMin <= 15) {
    fitScore += 10
  }
  
  // Penalty for long tasks when focus is low
  if (focus <= 2 && estimateMin > 45) {
    fitScore -= 15
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
    const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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
 * Generate recommendation when sliders change
 */
export async function generateSliderChangeRecommendation(
  userId: string,
  assistantId: string,
  assistant: AssistantConfig,
  allTasks: TestDayTask[],
  oldPlan: DayPlan,
  newPlan: DayPlan,
  date: string
): Promise<Proposal | null> {
  // Significant change detection
  const energyDelta = Math.abs(newPlan.energy - oldPlan.energy)
  const focusDelta = Math.abs(newPlan.focus - oldPlan.focus)
  
  if (energyDelta < 2 && focusDelta < 2) {
    // Small change - no recommendation needed
    return null
  }
  
  // Re-score all tasks with new energy/focus
  const newScores = allTasks.map(task =>
    calculateTaskScore(task, newPlan, {
      todayDate: date,
      totalTasksToday: allTasks.length,
      lightMinutesToday: 0
    })
  )
  
  // Find tasks that are now poorly matched
  const poorMatches = newScores
    .filter(s => s.breakdown.fit_bonus < 5)  // Low fit bonus
    .sort((a, b) => a.breakdown.fit_bonus - b.breakdown.fit_bonus)
  
  if (poorMatches.length === 0) {
    return null
  }
  
  const worstMatch = poorMatches[0]
  const taskToAdjust = allTasks.find(t => t.id === worstMatch.task_id)!
  
  // Generate recommendation based on new state
  let primaryAction: ProposalAction
  let reason: string
  
  // LOW FOCUS (1-2) - suggest postponing high cognitive load tasks
  if (newPlan.focus <= 2) {
    const highCognitiveLoadTasks = allTasks
      .filter(t => t.cognitive_load >= 4 && !t.completed)
      .sort((a, b) => b.cognitive_load - a.cognitive_load)
    
    if (highCognitiveLoadTasks.length > 0 && taskToAdjust.cognitive_load >= 4) {
      if (taskToAdjust.estimate_min > 30) {
        primaryAction = {
          type: 'decompose_task',
          task_id: taskToAdjust.id,
          metadata: { 
            target_duration: 10,
            start_small: true
          }
        }
        reason = `Przy niskim skupieniu (${newPlan.focus}/5) proponuję "Zacznij 10 min" dla "${taskToAdjust.title}" (Load ${taskToAdjust.cognitive_load}) zamiast pełnej sesji.`
      } else {
        const tomorrow = new Date(date)
        tomorrow.setDate(tomorrow.getDate() + 1)
        primaryAction = {
          type: 'move_task',
          task_id: taskToAdjust.id,
          from_date: date,
          to_date: tomorrow.toISOString().split('T')[0]
        }
        reason = `Przy niskim skupieniu (${newPlan.focus}/5) zalecam przełożyć "${taskToAdjust.title}" (Load ${taskToAdjust.cognitive_load}) na jutro.`
      }
    } else {
      return null
    }
  } else if (newPlan.focus >= 4) {
    // HIGH FOCUS (4-5) - suggest tackling hardest task first
    const hardestTasks = allTasks
      .filter(t => t.cognitive_load >= 4 && !t.completed)
      .sort((a, b) => b.cognitive_load - a.cognitive_load)
    
    if (hardestTasks.length > 0) {
      const topTask = allTasks.filter(t => !t.completed)[0]
      const hardestTask = hardestTasks[0]
      
      // Only recommend if hardest task is not already first
      if (topTask && hardestTask && hardestTask.id !== topTask.id) {
        primaryAction = {
          type: 'reorder',
          task_id: hardestTask.id,
          metadata: {
            new_position: 1,
            reason: 'Wysokie skupienie - wykorzystaj je na trudne zadania'
          }
        }
        reason = `Wysokie skupienie (${newPlan.focus}/5) - idealny moment na trudniejsze zadanie "${hardestTask.title}" (Load ${hardestTask.cognitive_load})!`
      } else {
        return null
      }
    } else {
      return null
    }
  } else {
    // NORMAL FOCUS (3) - no specific recommendation
    return null
  }
  
  return await createProposal(
    userId,
    assistantId,
    date,
    reason,
    primaryAction,
    []
  )
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
    const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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
 * Score and sort tasks by intelligent algorithm
 * Used by useScoredTasks hook in the UI
 */
export function scoreAndSortTasks(
  tasks: TestDayTask[],
  dayPlan: DayPlan,
  todayDate: string
): TestDayTask[] {
  // Calculate scores for all tasks
  const taskScores = tasks.map(task => ({
    task,
    score: calculateTaskScore(task, dayPlan, {
      todayDate,
      totalTasksToday: tasks.length,
      lightMinutesToday: 0
    })
  }))
  
  // Sort by score (highest first)
  taskScores.sort((a, b) => b.score.score - a.score.score)
  
  // Separate into categories for better organization
  const today = todayDate
  const overdue = taskScores.filter(ts => ts.task.due_date && ts.task.due_date < today)
  const dueToday = taskScores.filter(ts => ts.task.due_date === today)
  const inbox = taskScores.filter(ts => !ts.task.due_date)
  const future = taskScores.filter(ts => ts.task.due_date && ts.task.due_date > today)
  
  // Return in priority order: overdue > today > inbox > future
  // Each group is already sorted by score
  return [
    ...overdue.map(ts => ts.task),
    ...dueToday.map(ts => ts.task),
    ...inbox.map(ts => ts.task),
    ...future.map(ts => ts.task)
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
