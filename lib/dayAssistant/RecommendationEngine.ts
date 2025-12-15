/**
 * Recommendation Engine - Generates actionable recommendations for Day Assistant
 * 
 * Handles grouping tasks, moving tasks, simplifying, and finding meeting slots
 */

import { DayTask, EnergyMode } from '@/lib/types/dayAssistant'
import { inferContextType, ContextType } from './DayContext'

export interface Recommendation {
  id: string
  type: 'GROUP_TASKS' | 'MOVE_TASK' | 'ENERGY_CHANGE' | 'SCHEDULE_SLOT' | 'SIMPLIFY'
  title: string
  reason: string
  actions: Array<{
    op: string
    [key: string]: any
  }>
  priority: number  // 1-10, higher = more important
}

/**
 * Analyze tasks and generate recommendations
 */
export function generateRecommendations(
  tasks: DayTask[],
  energyMode: EnergyMode,
  momentum: 'stuck' | 'neutral' | 'flow',
  availableMinutes: number
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // 1. Check if energy mode change is needed based on momentum
  if (momentum === 'stuck' && energyMode !== 'crisis') {
    recommendations.push({
      id: `rec_energy_${Date.now()}`,
      type: 'ENERGY_CHANGE',
      title: 'Przełącz na tryb Zjazd',
      reason: 'Zauważyłem trudności z postępem - małe kroki pomogą',
      actions: [
        { op: 'CHANGE_ENERGY_MODE', mode: 'crisis' }
      ],
      priority: 9
    })
  }

  if (momentum === 'flow' && energyMode !== 'flow') {
    recommendations.push({
      id: `rec_energy_${Date.now()}`,
      type: 'ENERGY_CHANGE',
      title: 'Przełącz na tryb Flow',
      reason: 'Świetnie Ci idzie! Wykorzystaj ten moment',
      actions: [
        { op: 'CHANGE_ENERGY_MODE', mode: 'flow' }
      ],
      priority: 8
    })
  }

  // 2. Group similar tasks (batching)
  if (tasks.length >= 3) {
    const groupingRec = findGroupingOpportunities(tasks)
    if (groupingRec) {
      recommendations.push(groupingRec)
    }
  }

  // 3. Simplify overloaded schedule
  if (availableMinutes > 0) {
    const totalRequired = tasks.reduce((sum, t) => sum + t.estimated_duration, 0)
    if (totalRequired > availableMinutes * 1.5) {
      recommendations.push({
        id: `rec_simplify_${Date.now()}`,
        type: 'SIMPLIFY',
        title: 'Uprość harmonogram',
        reason: `Potrzebujesz ${totalRequired} min, masz ${availableMinutes} min`,
        actions: [
          { op: 'SUGGEST_POSTPONE', taskIds: findLowPriorityTasks(tasks, 2) }
        ],
        priority: 7
      })
    }
  }

  // 4. Move tasks to better slots (if mega important or pinned)
  const urgentTasks = tasks.filter(t => t.is_mega_important || t.is_pinned)
  if (urgentTasks.length > 0) {
    urgentTasks.forEach(task => {
      recommendations.push({
        id: `rec_move_${task.id}`,
        type: 'MOVE_TASK',
        title: `Zaplanuj: ${task.title}`,
        reason: 'Zadanie oznaczone jako pilne - znajdźmy czas',
        actions: [
          { op: 'FIND_SLOT', taskId: task.id, duration: task.estimated_duration }
        ],
        priority: 10
      })
    })
  }

  // Sort by priority (highest first)
  recommendations.sort((a, b) => b.priority - a.priority)

  // Return max 3 recommendations
  return recommendations.slice(0, 3)
}

/**
 * Find tasks that can be grouped by context
 */
function findGroupingOpportunities(tasks: DayTask[]): Recommendation | null {
  // Group tasks by inferred context
  const contextGroups = new Map<ContextType, DayTask[]>()

  tasks.forEach(task => {
    const context = inferContextType(task.title, task.description || undefined)
    if (!contextGroups.has(context)) {
      contextGroups.set(context, [])
    }
    contextGroups.get(context)!.push(task)
  })

  // Find the largest group with 2+ tasks
  let largestGroup: DayTask[] = []
  let largestContext: ContextType = 'unknown'

  contextGroups.forEach((group, context) => {
    if (group.length >= 2 && group.length > largestGroup.length && context !== 'unknown') {
      largestGroup = group
      largestContext = context
    }
  })

  if (largestGroup.length >= 2) {
    const totalDuration = largestGroup.reduce((sum, t) => sum + t.estimated_duration, 0)
    const contextNames: Record<ContextType, string> = {
      comms: 'komunikację',
      deep: 'głęboką pracę',
      admin: 'administrację',
      creative: 'twórczość',
      ops: 'operacje',
      unknown: 'zadania'
    }

    return {
      id: `rec_group_${Date.now()}`,
      type: 'GROUP_TASKS',
      title: `Zgrupuj ${contextNames[largestContext]} (${largestGroup.length} zadań)`,
      reason: 'Zmniejszysz przełączanie kontekstu',
      actions: [
        {
          op: 'CREATE_BLOCK',
          taskIds: largestGroup.map(t => t.id),
          durationMin: totalDuration,
          context: largestContext
        }
      ],
      priority: 8
    }
  }

  return null
}

/**
 * Find low priority tasks to postpone
 */
function findLowPriorityTasks(tasks: DayTask[], count: number): string[] {
  // Sort by priority: pinned/mega_important = high, others = low
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityA = (a.is_pinned ? 10 : 0) + (a.is_mega_important ? 10 : 0)
    const priorityB = (b.is_pinned ? 10 : 0) + (b.is_mega_important ? 10 : 0)
    return priorityA - priorityB
  })

  return sortedTasks.slice(0, count).map(t => t.id)
}

/**
 * Find best meeting slots in available windows
 */
export function findMeetingSlots(
  availableWindows: Array<{ start: string; end: string; minutes: number }>,
  durationMinutes: number,
  preferredHours: [number, number] = [10, 16],  // 10am - 4pm
  count: number = 3
): Array<{ start: string; end: string; score: number; reason: string }> {
  const slots: Array<{ start: string; end: string; score: number; reason: string }> = []

  for (const window of availableWindows) {
    if (window.minutes < durationMinutes) continue

    const windowStart = new Date(window.start)
    const windowHour = windowStart.getHours()

    // Skip if outside preferred hours
    if (windowHour < preferredHours[0] || windowHour >= preferredHours[1]) {
      continue
    }

    const slotStart = new Date(window.start)
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000)

    // Calculate score (prefer slots in middle of preferred range)
    const midHour = (preferredHours[0] + preferredHours[1]) / 2
    const distanceFromMid = Math.abs(windowHour - midHour)
    const score = 100 - (distanceFromMid * 10)

    let reason = ''
    if (windowHour >= 10 && windowHour < 12) {
      reason = 'Poranna energia, dobry czas na spotkanie'
    } else if (windowHour >= 14 && windowHour < 16) {
      reason = 'Popołudniowe okno, po lunchu'
    } else {
      reason = 'Dostępne okno czasowe'
    }

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      score,
      reason
    })
  }

  // Sort by score and return top N
  slots.sort((a, b) => b.score - a.score)
  return slots.slice(0, count)
}

/**
 * Detect if user needs a break based on activity
 */
export function shouldSuggestBreak(
  consecutiveWorkMinutes: number,
  energyMode: EnergyMode
): boolean {
  const breakThresholds: Record<EnergyMode, number> = {
    crisis: 45,    // Suggest break after 45 min in crisis mode
    normal: 90,    // Suggest break after 90 min normally
    flow: 120      // Allow longer sessions in flow
  }

  return consecutiveWorkMinutes >= breakThresholds[energyMode]
}
