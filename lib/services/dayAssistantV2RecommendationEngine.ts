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
  ScoreFactor
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

// Constants
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

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

/**
 * Calculate detailed score breakdown for tooltip display
 * This provides human-readable explanation of why a task is at its queue position
 */
export function calculateScoreBreakdown(
  task: TestDayTask,
  context: { energy: number; focus: number; context: string | null },
  todayDate: string
): DetailedScoreBreakdown {
  const factors: ScoreFactor[] = []
  
  // 1. Energy match
  const energyDiff = Math.abs(task.cognitive_load - context.energy)
  const energyScore = Math.max(0, 30 - (energyDiff * 10))
  factors.push({
    name: 'Dopasowanie energii',
    points: energyScore,
    positive: energyScore > 15,
    detail: `Load ${task.cognitive_load} vs Twoja energia: ${context.energy}`
  })
  
  // 2. Priority
  let priorityScore = 0
  let priorityDetail = ''
  if (task.is_must) {
    priorityScore = 30
    priorityDetail = 'MUST task'
  } else if (task.is_important) {
    priorityScore = 25
    priorityDetail = 'Important'
  } else if (task.priority >= 3) {
    priorityScore = 15
    priorityDetail = `Priority ${task.priority}`
  } else {
    priorityScore = task.priority * 5
    priorityDetail = 'Normal priority'
  }
  
  factors.push({
    name: 'Priorytet',
    points: priorityScore,
    positive: priorityScore > 10,
    detail: priorityDetail
  })
  
  // 3. Deadline urgency
  let deadlineScore = 0
  let deadlineDetail = 'Brak deadline'
  
  if (task.due_date) {
    if (task.due_date < todayDate) {
      const daysOverdue = Math.floor((new Date(todayDate).getTime() - new Date(task.due_date).getTime()) / MILLISECONDS_PER_DAY)
      deadlineScore = 25 // Overdue = high urgency
      deadlineDetail = `Przeterminowane (${daysOverdue} ${daysOverdue === 1 ? 'dzień' : 'dni'})`
    } else if (task.due_date === todayDate) {
      deadlineScore = 20 // Due today
      deadlineDetail = 'Due dziś'
    } else {
      const daysUntil = Math.floor((new Date(task.due_date).getTime() - new Date(todayDate).getTime()) / MILLISECONDS_PER_DAY)
      if (daysUntil === 1) {
        deadlineScore = 15
        deadlineDetail = 'Due jutro'
      } else {
        deadlineScore = 10
        deadlineDetail = `Due za ${daysUntil} dni`
      }
    }
  }
  
  factors.push({
    name: 'Deadline',
    points: deadlineScore,
    positive: deadlineScore > 15,
    detail: deadlineDetail
  })
  
  // 4. Postpone penalty
  if (task.postpone_count > 0) {
    const postponePenalty = -Math.min(task.postpone_count * 5, 20)
    factors.push({
      name: 'Postpone penalty',
      points: postponePenalty,
      positive: false,
      detail: `Przełożone ${task.postpone_count}x`
    })
  }
  
  // 5. Context match
  let contextScore = 0
  let contextDetail = ''
  if (context.context && task.context_type === context.context) {
    contextScore = 22
    contextDetail = `Pasuje do filtru: ${task.context_type}`
  } else if (!context.context) {
    contextScore = 10 // Neutral if no filter
    contextDetail = `Kontekst: ${task.context_type || 'brak'}`
  } else {
    contextScore = 5
    contextDetail = `Nie pasuje do filtru (${task.context_type} vs ${context.context})`
  }
  
  factors.push({
    name: 'Context match',
    points: contextScore,
    positive: contextScore > 15,
    detail: contextDetail
  })
  
  const total = factors.reduce((sum, f) => sum + f.points, 0)
  
  return {
    total: Math.max(0, Math.min(100, total)),
    factors,
    explanation: generateExplanation(factors, total)
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
        updated_at: new Date().toISOString()
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
        updated_at: new Date().toISOString()
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
        updated_at: new Date().toISOString()
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
      updated_at: new Date().toISOString()
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
        updated_at: new Date().toISOString()
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
        updated_at: new Date().toISOString()
      }
    }
  }
  
  // ========================================
  // CONTEXT BATCHING
  // ========================================
  const topTask = tasks[0]
  
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
          updated_at: new Date().toISOString()
        }
      }
    }
  }
  
  return null
}
