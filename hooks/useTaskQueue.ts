/**
 * Hook: useTaskQueue
 * Manages the task queue based on available work hours and scoring
 * Note: For intelligent scoring with ML-inspired algorithms, use useIntelligentQueue hook
 */

import { useMemo } from 'react'
import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'

export interface QueueResult {
  queue: TestDayTask[]
  remainingToday: TestDayTask[]
  later: TestDayTask[]
  availableMinutes: number
  usedMinutes: number
  usagePercentage: number
  overflowCount: number
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
 * Build smart queue with proper task distribution
 * Separates tasks into: Top 3 Queue, Remaining Today, and Later (overflow + future)
 * 
 * @param scoredTasks - All tasks with scores
 * @param capacity - Available minutes for today
 * @param todayISO - Today's date in YYYY-MM-DD format
 * @returns Object with queue, remainingToday, later, and capacity metrics
 */
export function buildSmartQueue(
  scoredTasks: TestDayTask[],
  capacity: number,
  todayISO: string
): {
  queue: TestDayTask[]
  remainingToday: TestDayTask[]
  later: TestDayTask[]
  usedTime: number
  capacity: number
  overflowCount: number
} {
  // 1. Split by date
  const todayTasks = scoredTasks.filter(t => t.due_date === todayISO)
  const futureTasks = scoredTasks.filter(t => t.due_date && t.due_date > todayISO)
  
  // Check if capacity available: if no capacity (work hours ended), move all today tasks to overflow
  if (capacity <= 0) {
    const later = [...todayTasks, ...futureTasks]
      .sort((a, b) => {
        // Tasks for today first
        if (a.due_date === todayISO && b.due_date !== todayISO) return -1
        if (a.due_date !== todayISO && b.due_date === todayISO) return 1
        // Rest by date
        if (!a.due_date && b.due_date) return 1
        if (a.due_date && !b.due_date) return -1
        if (!a.due_date && !b.due_date) return 0
        return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
      })
    
    return {
      queue: [],
      remainingToday: [],
      later,
      usedTime: 0,
      capacity: 0,
      overflowCount: todayTasks.length
    }
  }
  
  // 2. Separate pinned from unpinned
  const pinnedTasks = todayTasks.filter(t => t.is_must)
  const unpinnedTodayTasks = todayTasks
    .filter(t => !t.is_must)
    .sort((a, b) => ((b as any)._score || 0) - ((a as any)._score || 0))  // Sort by score DESC
  
  // 3. Build Top 3 Queue
  const queue: TestDayTask[] = []
  
  // Add pinned first
  pinnedTasks.forEach(task => {
    if (queue.length < 3) {
      queue.push(task)
    }
  })
  
  // Fill remaining slots with top scored unpinned
  for (const task of unpinnedTodayTasks) {
    if (queue.length < 3) {
      queue.push(task)
    } else {
      break
    }
  }
  
  // 4. Calculate capacity usage
  let usedTime = queue.reduce((sum, t) => sum + t.estimate_min, 0)
  
  // 5. Split remaining today's tasks by capacity
  const tasksNotInQueue = unpinnedTodayTasks.filter(t => !queue.includes(t))
  const remainingToday: TestDayTask[] = []
  const overflowToday: TestDayTask[] = []
  
  for (const task of tasksNotInQueue) {
    if (usedTime + task.estimate_min <= capacity) {
      // FITS in capacity
      remainingToday.push(task)
      usedTime += task.estimate_min
    } else {
      // DOESN'T FIT - overflow
      overflowToday.push(task)
    }
  }
  
  // 6. "Na później" = overflow + future tasks
  const later = [...overflowToday, ...futureTasks]
    .sort((a, b) => {
      // Sort: today's overflow first, then by due_date
      if (a.due_date === todayISO && b.due_date !== todayISO) return -1
      if (a.due_date !== todayISO && b.due_date === todayISO) return 1
      if (!a.due_date && b.due_date) return 1
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && !b.due_date) return 0
      // Both have due_date at this point (TypeScript knows this from checks above)
      return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    })
  
  return {
    queue,           // Top 3 (pinned + top scored)
    remainingToday,  // Rest of today that FIT in capacity
    later,           // Overflow + future
    usedTime,
    capacity,
    overflowCount: overflowToday.length
  }
}

/**
 * Build task queue based on available time
 * Force split: Max 10 tasks in queue, rest go to later
 * 
 * @note MAX_QUEUE_SIZE is set to 10 for optimal UI/UX:
 *   - Prevents vertical scrolling overload
 *   - Maintains focus on most important tasks
 *   - Ensures reasonable completion targets per day
 *   - Forces prioritization through queue management
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

  // Debug logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [useTaskQueue] Processing...', {
      totalTasks: scoredTasks.length,
      overdueTasks: overdueCount,
      mustTasks: mustCount,
      normalTasks: normalTasks.length,
      availableMinutes
    })
  }

  // If no available time, move ALL tasks to later queue
  // This ensures tasks don't show in "today" after work hours have ended
  // Note: Manual time blocks are added to availableMinutes before this function is called
  if (availableMinutes <= 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ [useTaskQueue] No available time - all tasks to later')
    }
    return { queue: [], later: orderedTasks }
  }

  /**
   * Maximum queue size for optimal UX
   * @constant {number} MAX_QUEUE_SIZE
   * - Prevents UI overflow with too many tasks
   * - Maintains focus on highest priority items
   * - Ensures achievable daily goals
   * - Can be adjusted based on user feedback
   */
  const MAX_QUEUE_SIZE = 15

  for (let i = 0; i < orderedTasks.length; i++) {
    const task = orderedTasks[i]
    
    // 🔥 FORCE SPLIT: Check queue size limit
    const queueFull = queue.length >= MAX_QUEUE_SIZE
    const wouldExceedCapacity = queuedMinutes + task.estimate_min > availableMinutes
    
    // Overdue tasks and MUST tasks have priority but still respect limits
    if (i < overdueCount + mustCount) {
      // Prioritize these tasks, but still check if they fit
      if (queueFull) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 [useTaskQueue] Adding to LATER (queue full):', task.title)
        }
        later.push(task)
      } else if (wouldExceedCapacity) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 [useTaskQueue] Adding to LATER (capacity):', task.title)
        }
        later.push(task)
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [useTaskQueue] Adding to QUEUE:', task.title)
        }
        queue.push(task)
        queuedMinutes += task.estimate_min
      }
      continue
    }

    // Regular tasks: check if they fit
    if (queueFull) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 [useTaskQueue] Adding to LATER (queue full):', task.title, {
          currentQueueSize: queue.length
        })
      }
      later.push(task)
    } else if (wouldExceedCapacity) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 [useTaskQueue] Adding to LATER (would exceed capacity):', task.title, {
          usedTime: queuedMinutes,
          taskEstimate: task.estimate_min,
          availableMinutes
        })
      }
      later.push(task)
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useTaskQueue] Adding to QUEUE:', task.title)
      }
      queue.push(task)
      queuedMinutes += task.estimate_min
    }
  }

  // Debug logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 [useTaskQueue] Final result:', {
      queue: queue.length,
      later: later.length,
      usedTime: queuedMinutes,
      usagePercentage: Math.round((queuedMinutes / availableMinutes) * 100)
    })
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
    
    // Get today's date
    const todayISO = new Date().toISOString().split('T')[0]
    
    // Use new smart queue logic
    const result = buildSmartQueue(scoredTasks, availableMinutes, todayISO)
    
    const usagePercentage = availableMinutes > 0 
      ? Math.round((result.usedTime / availableMinutes) * 100) 
      : 0

    return {
      queue: result.queue,
      remainingToday: result.remainingToday,
      later: result.later,
      availableMinutes,
      usedMinutes: result.usedTime,
      usagePercentage,
      overflowCount: result.overflowCount
    }
  }, [scoredTasks, dayPlan, manualTimeBlock])
}
