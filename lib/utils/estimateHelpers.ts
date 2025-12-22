/**
 * Estimate Helpers - Smart fallback logic for task estimates
 * Ensures we never show default 30 min everywhere
 */

import { TestDayTask } from '@/lib/types/dayAssistantV2'

/**
 * Calculate smart estimate based on task properties
 * Uses heuristics when no explicit estimate is set
 */
export function getSmartEstimate(task: TestDayTask): number {
  // If task has explicit estimate, use it
  if (task.estimate_min && task.estimate_min > 0) {
    return task.estimate_min
  }

  // Fallback logic based on task properties
  let estimate = 30 // Base default

  // Adjust based on cognitive load
  if (task.cognitive_load) {
    if (task.cognitive_load <= 2) {
      estimate = 15 // Light tasks
    } else if (task.cognitive_load >= 4) {
      estimate = 45 // Heavy tasks
    }
  }

  // Adjust based on title/description length (proxy for complexity)
  const titleLength = task.title?.length || 0
  const descLength = task.description?.length || 0
  const totalLength = titleLength + descLength

  if (totalLength < 30) {
    estimate = Math.min(estimate, 15) // Very short - likely quick task
  } else if (totalLength > 200) {
    estimate = Math.max(estimate, 45) // Detailed description - likely complex
  }

  // MUST tasks tend to be more important/complex
  if (task.is_must) {
    estimate = Math.max(estimate, 30)
  }

  // Context-based adjustments
  if (task.context_type === 'quick_wins') {
    estimate = Math.min(estimate, 15)
  } else if (task.context_type === 'deep_work') {
    estimate = Math.max(estimate, 60)
  } else if (task.context_type === 'admin' || task.context_type === 'communication') {
    estimate = 20
  }

  // If task has subtasks, sum their estimates
  if (task.subtasks && task.subtasks.length > 0) {
    const subtaskTotal = task.subtasks.reduce(
      (sum, sub) => sum + (sub.estimated_duration || 0),
      0
    )
    if (subtaskTotal > 0) {
      return subtaskTotal
    }
  }

  return estimate
}

/**
 * Format estimate for display
 */
export function formatEstimate(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (mins === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${mins}min`
}

/**
 * Get estimate with smart fallback and format it
 */
export function getFormattedEstimate(task: TestDayTask): string {
  const estimate = getSmartEstimate(task)
  return formatEstimate(estimate)
}

/**
 * Calculate total estimate for a list of tasks
 */
export function getTotalEstimate(tasks: TestDayTask[]): number {
  return tasks.reduce((sum, task) => sum + getSmartEstimate(task), 0)
}
