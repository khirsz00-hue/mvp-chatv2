/**
 * Advanced Task Scoring System
 * Implements comprehensive task prioritization based on multiple factors:
 * - Deadline proximity (highest weight)
 * - Priority level
 * - Cognitive load (subtracted as penalty)
 * - Postpone count (added as bonus to prevent perpetual postponement)
 */

import { TestDayTask } from '@/lib/types/dayAssistantV2'

export interface TaskScoreBreakdown {
  deadline: number
  priority: number
  cognitiveLoad: number  // This will be negative
  postpone: number
}

export interface TaskScoreResult {
  total: number
  breakdown: TaskScoreBreakdown
}

/**
 * Calculate deadline score based on time until deadline
 * @param dueDate - ISO date string or null
 * @returns Score from 0 to 150
 */
export function calculateDeadlineScore(dueDate: string | null | undefined): number {
  if (!dueDate) {
    // No deadline - lowest priority
    return 10
  }

  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  const hoursUntilDue = diffMs / (1000 * 60 * 60)

  if (hoursUntilDue < 0) {
    // Overdue - highest priority
    return 150
  } else if (hoursUntilDue < 2) {
    // Due in less than 2 hours
    return 100
  } else if (hoursUntilDue < 4) {
    // Due in 2-4 hours
    return 80
  } else if (hoursUntilDue < 8) {
    // Due today, more than 4 hours
    return 60
  } else if (hoursUntilDue < 24) {
    // Due today, end of day
    return 40
  } else if (hoursUntilDue < 48) {
    // Due tomorrow
    return 30
  } else if (hoursUntilDue < 168) {
    // Due this week (7 days)
    return 15
  } else {
    // Due later
    return 10
  }
}

/**
 * Calculate priority score based on task priority level
 * Supports both Todoist format (1-4) and P1-P3 format
 * @param priority - Priority value (number or string)
 * @returns Score from 5 to 50
 */
export function calculatePriorityScore(priority: number | string | undefined): number {
  // Handle string formats like 'P1', 'P2', 'P3'
  if (typeof priority === 'string') {
    const match = priority.match(/P?(\d+)/i)
    if (match) {
      const num = parseInt(match[1])
      // If string format 'P1', 'P2', 'P3' - convert to points directly
      switch (num) {
        case 1: return 50  // P1
        case 2: return 30  // P2
        case 3: return 10  // P3
        default: return 5
      }
    }
  }

  // Convert to number if needed
  const priorityNum = typeof priority === 'number' ? priority : 0

  // Todoist priority: 4=P1 (highest), 3=P2, 2=P3, 1=P4 (lowest)
  switch (priorityNum) {
    case 4:
      return 50  // P1 - highest
    case 3:
      return 30  // P2
    case 2:
      return 10  // P3
    case 1:
      return 5   // P4 - lowest
    default:
      return 5   // Default
  }
}

/**
 * Calculate cognitive load penalty
 * Lower cognitive load = easier task = should be prioritized when scores are equal
 * @param cognitiveLoad - Cognitive load value (1-5) or string like "3/5"
 * @returns Penalty value (will be subtracted from final score)
 */
export function calculateCognitiveLoadPenalty(cognitiveLoad: number | string | undefined): number {
  let load: number

  if (typeof cognitiveLoad === 'string') {
    // Handle "3/5" format
    const match = cognitiveLoad.match(/(\d+)/)
    load = match ? parseInt(match[1]) : 3
  } else if (typeof cognitiveLoad === 'number') {
    load = cognitiveLoad
  } else {
    // Default to medium load
    load = 3
  }

  // Clamp to 1-5 range
  load = Math.max(1, Math.min(5, load))

  // Each load level = 2 points penalty
  // 1/5 = -2, 2/5 = -4, 3/5 = -6, 4/5 = -8, 5/5 = -10
  return load * 2
}

/**
 * Calculate postpone bonus
 * Reward for tasks that have been postponed to prevent perpetual postponement
 * @param postponeCount - Number of times task was postponed
 * @returns Bonus points
 */
export function calculatePostponeBonus(postponeCount: number | undefined): number {
  return (postponeCount || 0) * 5  // +5 points per postponement
}

/**
 * Calculate complete task score with breakdown
 * Formula: final_score = deadline_score + priority_score - cognitive_load_penalty + postpone_bonus
 * @param task - Task object
 * @returns Score result with total and breakdown
 */
export function calculateTaskScore(task: TestDayTask): TaskScoreResult {
  const deadlineScore = calculateDeadlineScore(task.due_date)
  const priorityScore = calculatePriorityScore(task.priority)
  const cognitiveLoadPenalty = calculateCognitiveLoadPenalty(task.cognitive_load)
  const postponeBonus = calculatePostponeBonus(task.postpone_count)

  const finalScore = deadlineScore + priorityScore - cognitiveLoadPenalty + postponeBonus

  return {
    total: finalScore,
    breakdown: {
      deadline: deadlineScore,
      priority: priorityScore,
      cognitiveLoad: -cognitiveLoadPenalty,  // Store as negative for display
      postpone: postponeBonus
    }
  }
}

/**
 * Sort tasks by score (highest first)
 * @param tasks - Array of tasks to sort
 * @returns Sorted array of tasks with score metadata
 */
export function sortTasksByScore(tasks: TestDayTask[]): TestDayTask[] {
  return tasks
    .map(task => ({
      ...task,
      metadata: {
        ...task.metadata,
        advancedScore: calculateTaskScore(task)
      }
    }))
    .sort((a, b) => {
      const scoreA = a.metadata.advancedScore?.total || 0
      const scoreB = b.metadata.advancedScore?.total || 0
      return scoreB - scoreA
    })
}
