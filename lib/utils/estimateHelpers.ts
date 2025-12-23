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

  const totalLength = (task.title?.length || 0) + (task.description?.length || 0)
  const derivedEstimate = Math.ceil(totalLength / 60) * 10

  return Math.max(derivedEstimate, 10)
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
