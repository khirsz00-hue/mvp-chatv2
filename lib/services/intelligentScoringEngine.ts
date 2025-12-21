/**
 * Intelligent Scoring Engine
 * ML-inspired scoring system that learns from user behavior and adapts to context
 */

import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'

// User Behavior Profile
export interface UserBehaviorProfile {
  user_id: string
  peak_productivity_start: number  // Hour (0-23)
  peak_productivity_end: number    // Hour (0-23)
  preferred_task_duration: number  // Minutes
  context_switch_sensitivity: number  // 0-1 (0=low sensitivity, 1=high sensitivity)
  postpone_patterns: Record<string, any>  // Task patterns that get postponed
  energy_patterns: EnergyPattern[]  // Historical energy levels by hour
  completion_streaks: CompletionStreak[]  // Recent completion patterns
  updated_at: string
}

export interface EnergyPattern {
  hour: number  // 0-23
  avg_energy: number  // 1-5
  avg_focus: number  // 1-5
  completed_tasks: number
}

export interface CompletionStreak {
  date: string
  completed_count: number
  postponed_count: number
  avg_completion_time: number  // Minutes
}

// Intelligent Score Result
export interface IntelligentScoreResult {
  score: number
  breakdown: ScoreBreakdown
  confidence: number  // 0-1
  reasoning: string[]  // Polish language explanations
}

export interface ScoreBreakdown {
  base: number
  contextual_boost: number
  predictive_adjustment: number
  momentum_factor: number
}

// Default profile for new users
export const DEFAULT_BEHAVIOR_PROFILE: UserBehaviorProfile = {
  user_id: '',
  peak_productivity_start: 9,
  peak_productivity_end: 12,
  preferred_task_duration: 30,
  context_switch_sensitivity: 0.5,
  postpone_patterns: {},
  energy_patterns: [],
  completion_streaks: [],
  updated_at: new Date().toISOString()
}

/**
 * Calculate intelligent score for a task
 */
export function calculateIntelligentScore(
  task: TestDayTask,
  dayPlan: DayPlan,
  profile: UserBehaviorProfile,
  context: {
    todayDate: string
    currentHour: number
    recentTasks: TestDayTask[]
    upcomingEvents?: { start: Date; end: Date }[]
  }
): IntelligentScoreResult {
  const reasoning: string[] = []
  const breakdown: ScoreBreakdown = {
    base: 0,
    contextual_boost: 0,
    predictive_adjustment: 0,
    momentum_factor: 0
  }

  // 1. Base Score (enhanced with exponential weights)
  breakdown.base = calculateEnhancedBaseScore(task, context.todayDate, reasoning)

  // 2. Context Switch Cost
  const contextSwitchCost = calculateContextSwitchCost(
    task,
    context.recentTasks,
    profile.context_switch_sensitivity,
    reasoning
  )
  breakdown.contextual_boost -= contextSwitchCost

  // 3. Time-of-Day Fit
  const timeOfDayBonus = calculateTimeOfDayFit(
    task,
    context.currentHour,
    profile,
    dayPlan,
    reasoning
  )
  breakdown.contextual_boost += timeOfDayBonus

  // 4. Completion Probability
  const completionAdjustment = calculateCompletionProbability(
    task,
    profile,
    context.currentHour,
    reasoning
  )
  breakdown.predictive_adjustment += completionAdjustment

  // 5. Momentum Bonus
  const momentumBonus = calculateMomentumBonus(
    task,
    context.recentTasks,
    reasoning
  )
  breakdown.momentum_factor += momentumBonus

  // 6. Event Proximity Penalty
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    const eventPenalty = calculateEventProximityPenalty(
      task,
      context.upcomingEvents,
      reasoning
    )
    breakdown.contextual_boost -= eventPenalty
  }

  // Calculate final score
  const score = 
    breakdown.base + 
    breakdown.contextual_boost + 
    breakdown.predictive_adjustment + 
    breakdown.momentum_factor

  // Calculate confidence based on profile data quality
  const confidence = calculateConfidence(profile, context.recentTasks.length)

  return {
    score: Math.max(0, score),
    breakdown,
    confidence,
    reasoning
  }
}

/**
 * Enhanced base score with exponential weights for urgency
 */
function calculateEnhancedBaseScore(
  task: TestDayTask,
  todayDate: string,
  reasoning: string[]
): number {
  let score = 0

  // Priority (exponential scaling)
  const priorityScore = Math.pow(task.priority, 1.5) * 8
  score += priorityScore
  if (task.priority >= 4) {
    reasoning.push(`Wysoki priorytet (P${task.priority})`)
  }

  // Deadline proximity (exponential urgency)
  if (task.due_date) {
    const daysUntil = calculateDaysUntil(task.due_date, todayDate)
    if (daysUntil < 0) {
      score += 50 // Overdue - highest priority
      reasoning.push(`Zadanie spóźnione o ${Math.abs(daysUntil)} dni`)
    } else if (daysUntil === 0) {
      score += 35
      reasoning.push('Deadline dziś')
    } else if (daysUntil === 1) {
      score += 20
      reasoning.push('Deadline jutro')
    } else if (daysUntil <= 3) {
      score += 10
    }
  }

  // MUST tasks
  if (task.is_must) {
    score += 30
    reasoning.push('Zadanie MUST')
  }

  // Important tasks
  if (task.is_important) {
    score += 15
  }

  return score
}

/**
 * Calculate context switch cost
 * Penalty for switching between different project types or contexts
 */
function calculateContextSwitchCost(
  task: TestDayTask,
  recentTasks: TestDayTask[],
  sensitivity: number,
  reasoning: string[]
): number {
  if (recentTasks.length === 0) return 0

  const lastTask = recentTasks[recentTasks.length - 1]
  
  // Check context switch
  if (lastTask.context_type && task.context_type && 
      lastTask.context_type !== task.context_type) {
    const cost = 15 * sensitivity
    if (cost > 5) {
      reasoning.push(`Zmiana kontekstu z "${lastTask.context_type}" na "${task.context_type}"`)
    }
    return cost
  }

  // Check cognitive load switch (from high to low or vice versa)
  const loadDiff = Math.abs(task.cognitive_load - lastTask.cognitive_load)
  if (loadDiff >= 3) {
    const cost = 10 * sensitivity
    reasoning.push('Duża zmiana obciążenia kognitywnego')
    return cost
  }

  return 0
}

/**
 * Calculate time-of-day fit based on historical patterns
 */
function calculateTimeOfDayFit(
  task: TestDayTask,
  currentHour: number,
  profile: UserBehaviorProfile,
  dayPlan: DayPlan,
  reasoning: string[]
): number {
  let bonus = 0

  // Peak productivity hours
  const isPeakHour = currentHour >= profile.peak_productivity_start && 
                     currentHour < profile.peak_productivity_end
  
  if (isPeakHour && task.cognitive_load >= 4) {
    bonus += 15
    reasoning.push('Trudne zadanie w czasie szczytu produktywności')
  } else if (isPeakHour && task.cognitive_load <= 2) {
    bonus -= 5 // Penalty - don't waste peak hours on easy tasks
  }

  // Historical energy pattern match
  const energyPattern = profile.energy_patterns.find(p => p.hour === currentHour)
  if (energyPattern) {
    const avgState = (energyPattern.avg_energy + energyPattern.avg_focus) / 2
    const taskRequirement = task.cognitive_load
    const fitScore = 5 - Math.abs(avgState - taskRequirement)
    bonus += fitScore * 2
  }

  // Current energy/focus alignment
  const currentState = (dayPlan.energy + dayPlan.focus) / 2
  const fitDiff = Math.abs(currentState - task.cognitive_load)
  
  if (fitDiff <= 1) {
    bonus += 10
    reasoning.push('Idealne dopasowanie do aktualnej energii i skupienia')
  } else if (fitDiff >= 3) {
    bonus -= 8
    if (currentState < task.cognitive_load) {
      reasoning.push('Zadanie zbyt wymagające dla obecnego stanu')
    }
  }

  return bonus
}

/**
 * Predict completion probability based on historical patterns
 */
function calculateCompletionProbability(
  task: TestDayTask,
  profile: UserBehaviorProfile,
  currentHour: number,
  reasoning: string[]
): number {
  let adjustment = 0

  // Postpone pattern analysis
  if (task.postpone_count >= 3) {
    // Task with high postpone count
    const patternKey = `cognitive_${task.cognitive_load}`
    const pattern = profile.postpone_patterns[patternKey]
    
    if (pattern && pattern.avg_postpone_count > 2) {
      adjustment -= 20
      reasoning.push(`Zadania tego typu często откładane (${task.postpone_count}x)`)
    } else {
      // Escalate - actually better to do it now
      adjustment += 10
      reasoning.push('Czas w końcu to zrobić!')
    }
  }

  // Task duration vs preferred duration
  const durationDiff = Math.abs(task.estimate_min - profile.preferred_task_duration)
  if (durationDiff <= 10) {
    adjustment += 8
    reasoning.push('Długość zadania odpowiada preferencjom')
  } else if (task.estimate_min > profile.preferred_task_duration * 2) {
    adjustment -= 10
  }

  // Completion streak boost
  if (profile.completion_streaks.length > 0) {
    const recentStreak = profile.completion_streaks.slice(-3)
    const avgCompletionRate = recentStreak.reduce((sum, s) => 
      sum + (s.completed_count / (s.completed_count + s.postponed_count)), 0
    ) / recentStreak.length

    if (avgCompletionRate > 0.7) {
      adjustment += 5
      reasoning.push('Dobra passa ukończeń')
    }
  }

  return adjustment
}

/**
 * Calculate momentum bonus for continuing similar tasks
 */
function calculateMomentumBonus(
  task: TestDayTask,
  recentTasks: TestDayTask[],
  reasoning: string[]
): number {
  if (recentTasks.length === 0) return 0

  let bonus = 0
  const recentCompleted = recentTasks.slice(-3)

  // Same context momentum
  const sameContextCount = recentCompleted.filter(
    t => t.context_type === task.context_type
  ).length

  if (sameContextCount >= 2) {
    bonus += 12
    reasoning.push(`Momentum w kontekście "${task.context_type}"`)
  }

  // Similar cognitive load momentum
  const similarLoadCount = recentCompleted.filter(
    t => Math.abs(t.cognitive_load - task.cognitive_load) <= 1
  ).length

  if (similarLoadCount >= 2) {
    bonus += 8
    reasoning.push('Kontynuacja podobnych zadań')
  }

  return bonus
}

/**
 * Calculate penalty for tasks that might be interrupted by events
 */
function calculateEventProximityPenalty(
  task: TestDayTask,
  upcomingEvents: { start: Date; end: Date }[],
  reasoning: string[]
): number {
  if (upcomingEvents.length === 0) return 0

  const now = new Date()
  const taskEndTime = new Date(now.getTime() + task.estimate_min * 60000)

  // Check if task would be interrupted by any event
  for (const event of upcomingEvents) {
    const minutesUntilEvent = (event.start.getTime() - now.getTime()) / 60000

    // If event starts during task execution
    if (event.start < taskEndTime && event.start > now) {
      const penalty = 25
      reasoning.push(`Spotkanie za ${Math.round(minutesUntilEvent)} min - zadanie może być przerwane`)
      return penalty
    }

    // If not enough time before event
    if (minutesUntilEvent < task.estimate_min && minutesUntilEvent > 0) {
      const penalty = 15
      reasoning.push(`Za mało czasu przed spotkaniem (${Math.round(minutesUntilEvent)} min)`)
      return penalty
    }
  }

  return 0
}

/**
 * Calculate confidence score based on profile data quality
 */
function calculateConfidence(
  profile: UserBehaviorProfile,
  recentTaskCount: number
): number {
  let confidence = 0.5 // Base confidence

  // More energy patterns = higher confidence
  if (profile.energy_patterns.length >= 12) {
    confidence += 0.2
  } else if (profile.energy_patterns.length >= 6) {
    confidence += 0.1
  }

  // Completion streak history
  if (profile.completion_streaks.length >= 7) {
    confidence += 0.15
  } else if (profile.completion_streaks.length >= 3) {
    confidence += 0.1
  }

  // Recent task context
  if (recentTaskCount >= 5) {
    confidence += 0.15
  } else if (recentTaskCount >= 2) {
    confidence += 0.1
  }

  return Math.min(1, confidence)
}

/**
 * Helper: Calculate days until due date
 */
function calculateDaysUntil(dueDate: string, todayDate: string): number {
  const due = new Date(dueDate)
  const today = new Date(todayDate)
  const diffMs = due.getTime() - today.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Get or create default behavior profile
 */
export function getDefaultProfile(userId: string): UserBehaviorProfile {
  return {
    ...DEFAULT_BEHAVIOR_PROFILE,
    user_id: userId
  }
}
