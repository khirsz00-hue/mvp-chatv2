/**
 * Hook: useTaskQueue
 * Manages the task queue based on available work hours and scoring
 * Note: For intelligent scoring with ML-inspired algorithms, use useIntelligentQueue hook
 */

import { useMemo } from 'react'
import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'

export interface QueueResult {
  queue: TestDayTask[]
  later: TestDayTask[]
  availableMinutes: number
  usedMinutes: number
  usagePercentage: number
}

/**
 * Check if task is overdue
 * Note: due_date is stored as PostgreSQL DATE type (date-only, no timezone)
 * Format is 'YYYY-MM-DD', so string comparison works correctly
 */
export function isTaskOverdue(task: TestDayTask): boolean {
  if (!task.due_date) return false
  
  // Compare date strings (due_date is stored as DATE, not datetime)
  // Both are in 'YYYY-MM-DD' format, so lexicographic comparison works
  const today = new Date().toISOString().split('T')[0]
  return task.due_date < today
}

/**
 * Get days overdue (0 if not overdue)
 * Note: Converts date strings to Date objects for accurate day calculation
 * Assumes due_date is in 'YYYY-MM-DD' format (PostgreSQL DATE type)
 */
export function getDaysOverdue(task: TestDayTask): number {
  if (!task.due_date) return 0
  
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to midnight for accurate day comparison
  
  const dueDate = new Date(task.due_date)
  dueDate.setHours(0, 0, 0, 0) // Normalize to midnight
  
  const diffMs = today.getTime() - dueDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Calculate available minutes until work end time
 * Note: This assumes work hours are within the same day.
 * If work extends past midnight, returns 0.
 * @param workEndTime - End time in HH:MM format
 * @param manualTimeBlock - Additional minutes added manually by user
 */
export function calculateAvailableMinutes(workEndTime?: string, manualTimeBlock: number = 0): number {
  let baseMinutes = 0
  
  if (!workEndTime) {
    // Default: assume 8 hours from now
    baseMinutes = 8 * 60
  } else {
    const now = new Date()
    const [hours, minutes] = workEndTime.split(':').map(Number)
    const workEnd = new Date()
    workEnd.setHours(hours, minutes, 0, 0)

    // If work end time has passed, return 0 (unless manual time block added)
    if (workEnd <= now) {
      baseMinutes = 0
    } else {
      const diffMs = workEnd.getTime() - now.getTime()
      baseMinutes = Math.floor(diffMs / 1000 / 60)
    }
  }
  
  // Add manual time block
  return baseMinutes + manualTimeBlock
}

/**
 * Build task queue based on available time
 */
export function buildQueue(
  scoredTasks: TestDayTask[],
  availableMinutes: number
): { queue: TestDayTask[]; later: TestDayTask[] } {
  let queuedMinutes = 0
  const queue: TestDayTask[] = []
  const later: TestDayTask[] = []

  // Separate overdue tasks (single pass through scoredTasks for performance)
  const overdueTasks: TestDayTask[] = []
  const mustTasks: TestDayTask[] = []
  const normalTasks: TestDayTask[] = []
  
  for (const task of scoredTasks) {
    if (isTaskOverdue(task)) {
      overdueTasks.push(task)
    } else if (task.is_must) {
      mustTasks.push(task)
    } else {
      normalTasks.push(task)
    }
  }

  // Process tasks in order: overdue → MUST → regular
  const orderedTasks = [
    ...overdueTasks,
    ...mustTasks,
    ...normalTasks
  ]

  const overdueCount = overdueTasks.length
  const mustCount = mustTasks.length

  // If no available time, move ALL tasks to later queue (unless manual time added)
  // This ensures tasks don't show in "today" after work hours
  if (availableMinutes <= 0) {
    return { queue: [], later: orderedTasks }
  }

  for (let i = 0; i < orderedTasks.length; i++) {
    const task = orderedTasks[i]
    
    // Overdue tasks and MUST tasks have priority but still respect time limits
    // Only add if there's available time remaining
    if (i < overdueCount + mustCount) {
      // Prioritize these tasks, but still check if they fit
      if (queuedMinutes + task.estimate_min <= availableMinutes) {
        queue.push(task)
        queuedMinutes += task.estimate_min
      } else {
        later.push(task)
      }
      continue
    }

    // Regular tasks: check if they fit
    if (queuedMinutes + task.estimate_min <= availableMinutes) {
      queue.push(task)
      queuedMinutes += task.estimate_min
    } else {
      later.push(task)
    }
  }

  return { queue, later }
}

// Configuration: offset for current task being worked on
const CURRENT_TASK_OFFSET = 1

/**
 * Fill NEXT queue when time is available
 * Takes top tasks from LATER based on scoring
 */
export function fillQueueWithAvailableTime(
  queue: TestDayTask[],
  later: TestDayTask[],
  availableMinutes: number,
  maxNextTasks: number = 5
): { queue: TestDayTask[]; later: TestDayTask[] } {
  const queuedMinutes = queue.reduce((sum, t) => sum + t.estimate_min, 0)
  const remainingMinutes = availableMinutes - queuedMinutes
  
  // Account for current task being worked on
  const maxQueueLength = maxNextTasks + CURRENT_TASK_OFFSET
  
  // If no time remaining or queue already has enough tasks
  if (remainingMinutes <= 0 || queue.length >= maxQueueLength) {
    return { queue, later }
  }
  
  // Take top tasks from later that fit in remaining time
  const newQueue = [...queue]
  let addedMinutes = 0
  const addedIndices = new Set<number>()
  
  // Collect indices of tasks to add (iterate forward to maintain scoring order)
  for (let i = 0; i < later.length && newQueue.length < maxQueueLength; i++) {
    const task = later[i]
    
    if (addedMinutes + task.estimate_min <= remainingMinutes) {
      newQueue.push(task)
      addedMinutes += task.estimate_min
      addedIndices.add(i)
    }
  }
  
  // Create new later array without added tasks
  const newLater = later.filter((_, index) => !addedIndices.has(index))
  
  return { queue: newQueue, later: newLater }
}

/**
 * Hook to manage task queue with positions
 * @param scoredTasks - Tasks with scores
 * @param dayPlan - Day plan configuration
 * @param manualTimeBlock - Additional minutes added manually by user
 */
export function useTaskQueue(
  scoredTasks: TestDayTask[],
  dayPlan: DayPlan | null,
  manualTimeBlock: number = 0
): QueueResult {
  return useMemo(() => {
    const workEndTime = dayPlan?.metadata?.work_end_time as string | undefined
    const availableMinutes = calculateAvailableMinutes(workEndTime, manualTimeBlock)
    
    let { queue, later } = buildQueue(scoredTasks, availableMinutes)
    
    // Fill queue with next-best tasks if time available
    const filledQueue = fillQueueWithAvailableTime(queue, later, availableMinutes)
    queue = filledQueue.queue
    later = filledQueue.later
    
    const usedMinutes = queue.reduce((sum, task) => sum + task.estimate_min, 0)
    const usagePercentage = availableMinutes > 0 
      ? Math.round((usedMinutes / availableMinutes) * 100) 
      : 0

    return {
      queue,
      later,
      availableMinutes,
      usedMinutes,
      usagePercentage
    }
  }, [scoredTasks, dayPlan, manualTimeBlock])
}
