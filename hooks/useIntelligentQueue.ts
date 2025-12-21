/**
 * useIntelligentQueue Hook
 * Intelligent task queue with dynamic repacking and alternatives
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'
import { 
  calculateIntelligentScore, 
  IntelligentScoreResult,
  UserBehaviorProfile,
  getDefaultProfile
} from '@/lib/services/intelligentScoringEngine'
import { getUserBehaviorProfile } from '@/lib/services/behaviorLearningService'

// Queue Slot with intelligent metadata
export interface QueueSlot {
  task: TestDayTask
  score: number
  confidence: number
  estimatedStartTime: Date
  estimatedEndTime: Date
  reasoning: string[]
  alternatives: TestDayTask[]  // Tasks that could be swapped in
}

// Hook result
export interface IntelligentQueueResult {
  queue: QueueSlot[]
  later: TestDayTask[]
  availableMinutes: number
  usedMinutes: number
  usagePercentage: number
  isLoading: boolean
  buildQueue: () => void
  completeTask: (taskId: string) => void
  swapTaskInQueue: (slotIndex: number, newTaskId: string) => void
}

/**
 * useIntelligentQueue Hook
 */
export function useIntelligentQueue(
  tasks: TestDayTask[],
  dayPlan: DayPlan | null,
  userId: string,
  options: {
    autoRefresh?: boolean
    refreshInterval?: number  // milliseconds, default 5 minutes
    upcomingEvents?: { start: Date; end: Date }[]
  } = {}
): IntelligentQueueResult {
  const { 
    autoRefresh = true, 
    refreshInterval = 5 * 60 * 1000,  // 5 minutes
    upcomingEvents = []
  } = options

  const [profile, setProfile] = useState<UserBehaviorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load user behavior profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const userProfile = await getUserBehaviorProfile(userId)
        setProfile(userProfile || getDefaultProfile(userId))
      } catch (error) {
        console.error('[IntelligentQueue] Error loading profile:', error)
        setProfile(getDefaultProfile(userId))
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadProfile()
    }
  }, [userId])

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return

    const timer = setInterval(() => {
      setRefreshTrigger(prev => prev + 1)
    }, refreshInterval)

    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval])

  // Build intelligent queue
  const { queue, later, availableMinutes, usedMinutes } = useMemo(() => {
    if (!dayPlan || !profile) {
      return {
        queue: [],
        later: [],
        availableMinutes: 0,
        usedMinutes: 0
      }
    }

    return buildIntelligentQueue(
      tasks,
      dayPlan,
      profile,
      {
        todayDate: new Date().toISOString().split('T')[0],
        currentHour: new Date().getHours(),
        upcomingEvents
      }
    )
  }, [tasks, dayPlan, profile, refreshTrigger, upcomingEvents])

  // Manual queue rebuild
  const buildQueue = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Complete task and rebuild queue
  const completeTask = useCallback((taskId: string) => {
    // This would be handled by the parent component
    // Just trigger rebuild here
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Swap task in queue
  const swapTaskInQueue = useCallback((slotIndex: number, newTaskId: string) => {
    // This would modify the task list in parent component
    // Just trigger rebuild here
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const usagePercentage = availableMinutes > 0 
    ? Math.round((usedMinutes / availableMinutes) * 100) 
    : 0

  return {
    queue,
    later,
    availableMinutes,
    usedMinutes,
    usagePercentage,
    isLoading,
    buildQueue,
    completeTask,
    swapTaskInQueue
  }
}

/**
 * Build intelligent queue with scoring and alternatives
 */
function buildIntelligentQueue(
  tasks: TestDayTask[],
  dayPlan: DayPlan,
  profile: UserBehaviorProfile,
  context: {
    todayDate: string
    currentHour: number
    upcomingEvents: { start: Date; end: Date }[]
  }
): {
  queue: QueueSlot[]
  later: TestDayTask[]
  availableMinutes: number
  usedMinutes: number
} {
  // Calculate available minutes
  const availableMinutes = calculateAvailableMinutes(
    dayPlan.metadata?.work_end_time as string | undefined,
    context.upcomingEvents
  )

  // Score all incomplete tasks
  const incompleteTasks = tasks.filter(t => !t.completed)
  const recentTasks = tasks
    .filter(t => t.completed)
    .slice(-5)  // Last 5 completed tasks

  const scoredTasks = incompleteTasks.map(task => {
    const scoreResult = calculateIntelligentScore(
      task,
      dayPlan,
      profile,
      {
        todayDate: context.todayDate,
        currentHour: context.currentHour,
        recentTasks,
        upcomingEvents: context.upcomingEvents
      }
    )

    return {
      task,
      scoreResult
    }
  })

  // Sort by score (highest first)
  scoredTasks.sort((a, b) => b.scoreResult.score - a.scoreResult.score)

  // Build queue with time constraints
  const queue: QueueSlot[] = []
  const later: TestDayTask[] = []
  let usedMinutes = 0
  let currentTime = new Date()

  for (const { task, scoreResult } of scoredTasks) {
    // MUST tasks and overdue always go in queue
    if (task.is_must || isOverdue(task, context.todayDate)) {
      const slot = createQueueSlot(
        task,
        scoreResult,
        currentTime,
        scoredTasks.filter(st => st.task.id !== task.id).slice(0, 3)
      )
      queue.push(slot)
      usedMinutes += task.estimate_min
      currentTime = slot.estimatedEndTime
      continue
    }

    // Check if task fits before next event
    const fitsBeforeEvent = checkEventFit(
      task,
      currentTime,
      context.upcomingEvents
    )

    if (!fitsBeforeEvent) {
      later.push(task)
      continue
    }

    // Check if fits in available time
    if (usedMinutes + task.estimate_min <= availableMinutes) {
      const slot = createQueueSlot(
        task,
        scoreResult,
        currentTime,
        scoredTasks.filter(st => st.task.id !== task.id).slice(0, 3)
      )
      queue.push(slot)
      usedMinutes += task.estimate_min
      currentTime = slot.estimatedEndTime
    } else {
      later.push(task)
    }
  }

  return {
    queue,
    later,
    availableMinutes,
    usedMinutes
  }
}

/**
 * Create queue slot with metadata
 */
function createQueueSlot(
  task: TestDayTask,
  scoreResult: IntelligentScoreResult,
  startTime: Date,
  alternatives: Array<{ task: TestDayTask; scoreResult: IntelligentScoreResult }>
): QueueSlot {
  const endTime = new Date(startTime.getTime() + task.estimate_min * 60000)

  // Select best alternatives (similar duration, high score)
  const goodAlternatives = alternatives
    .filter(alt => Math.abs(alt.task.estimate_min - task.estimate_min) <= 10)
    .sort((a, b) => b.scoreResult.score - a.scoreResult.score)
    .slice(0, 2)
    .map(alt => alt.task)

  return {
    task,
    score: scoreResult.score,
    confidence: scoreResult.confidence,
    estimatedStartTime: startTime,
    estimatedEndTime: endTime,
    reasoning: scoreResult.reasoning,
    alternatives: goodAlternatives
  }
}

/**
 * Calculate available minutes until work end time
 */
function calculateAvailableMinutes(
  workEndTime?: string,
  upcomingEvents: { start: Date; end: Date }[] = []
): number {
  const now = new Date()
  
  if (!workEndTime) {
    // Default: 8 hours from now
    return 8 * 60
  }

  const [hours, minutes] = workEndTime.split(':').map(Number)
  const workEnd = new Date()
  workEnd.setHours(hours, minutes, 0, 0)

  // If work end time has passed, return 0
  if (workEnd <= now) {
    return 0
  }

  let availableMs = workEnd.getTime() - now.getTime()

  // Subtract time blocked by events
  for (const event of upcomingEvents) {
    if (event.start > now && event.end <= workEnd) {
      const eventDuration = event.end.getTime() - event.start.getTime()
      availableMs -= eventDuration
    }
  }

  return Math.max(0, Math.floor(availableMs / 1000 / 60))
}

/**
 * Check if task fits before next event
 */
export function checkEventFit(
  task: TestDayTask,
  startTime: Date,
  upcomingEvents: { start: Date; end: Date }[]
): boolean {
  if (upcomingEvents.length === 0) return true

  const taskEndTime = new Date(startTime.getTime() + task.estimate_min * 60000)

  // Check if task would overlap with any event
  for (const event of upcomingEvents) {
    // Task starts during event
    if (startTime >= event.start && startTime < event.end) {
      return false
    }

    // Task ends during event
    if (taskEndTime > event.start && taskEndTime <= event.end) {
      return false
    }

    // Task encompasses event
    if (startTime < event.start && taskEndTime > event.end) {
      return false
    }
  }

  return true
}

/**
 * Check if task is overdue
 */
function isOverdue(task: TestDayTask, todayDate: string): boolean {
  if (!task.due_date) return false
  return task.due_date < todayDate
}
