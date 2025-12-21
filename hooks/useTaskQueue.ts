/**
 * Hook: useTaskQueue
 * Manages the task queue based on available work hours and scoring
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
 * Calculate available minutes until work end time
 * Note: This assumes work hours are within the same day.
 * If work extends past midnight, returns 0.
 */
export function calculateAvailableMinutes(workEndTime?: string): number {
  if (!workEndTime) {
    // Default: assume 8 hours from now
    return 8 * 60
  }

  const now = new Date()
  const [hours, minutes] = workEndTime.split(':').map(Number)
  const workEnd = new Date()
  workEnd.setHours(hours, minutes, 0, 0)

  // If work end time has passed, return 0
  if (workEnd <= now) {
    return 0
  }

  const diffMs = workEnd.getTime() - now.getTime()
  return Math.floor(diffMs / 1000 / 60)
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

  for (const task of scoredTasks) {
    // MUST tasks always go in the queue
    if (task.is_must) {
      queue.push(task)
      queuedMinutes += task.estimate_min
      continue
    }

    // Regular tasks: check if they fit in available time
    if (queuedMinutes + task.estimate_min <= availableMinutes) {
      queue.push(task)
      queuedMinutes += task.estimate_min
    } else {
      later.push(task)
    }
  }

  return { queue, later }
}

/**
 * Hook to manage task queue with positions
 */
export function useTaskQueue(
  scoredTasks: TestDayTask[],
  dayPlan: DayPlan | null
): QueueResult {
  return useMemo(() => {
    const workEndTime = dayPlan?.metadata?.work_end_time as string | undefined
    const availableMinutes = calculateAvailableMinutes(workEndTime)
    
    const { queue, later } = buildQueue(scoredTasks, availableMinutes)
    
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
  }, [scoredTasks, dayPlan])
}
