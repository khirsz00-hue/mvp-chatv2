/**
 * Capacity Manager Module
 * Smart overflow detection and capacity management
 */

import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'

export interface CapacityAnalysis {
  availableMinutes: number
  scheduledMinutes: number
  overflowMinutes: number
  isOverloaded: boolean
  queueTasks: TestDayTask[]
  overflowTasks: TestDayTask[]
}

export interface OverflowAlert {
  type: 'warning' | 'info'
  title: string
  message: string
  actions: OverflowAction[]
}

export interface OverflowAction {
  label: string
  action: 'SPLIT_TASK' | 'MOVE_TO_TOMORROW' | 'REDUCE_ESTIMATE' | 'CONFIRM_OVERLOAD'
  data?: any
}

/**
 * Calculate queue with overflow detection
 */
export function calculateQueueWithOverflow(
  tasks: TestDayTask[],
  dayPlan: DayPlan | null,
  availableMinutes: number
): CapacityAnalysis {
  const todayISO = new Date().toISOString().split('T')[0]
  
  // Filter today's tasks
  const todayTasks = tasks.filter(t => t.due_date === todayISO && !t.completed)
  
  // Sort by priority/score (MUST tasks first)
  const sortedTasks = [...todayTasks].sort((a, b) => {
    if (a.is_must && !b.is_must) return -1
    if (!a.is_must && b.is_must) return 1
    return b.priority - a.priority
  })
  
  // Calculate what fits in capacity
  let scheduledMinutes = 0
  const queueTasks: TestDayTask[] = []
  const overflowTasks: TestDayTask[] = []
  
  for (const task of sortedTasks) {
    if (scheduledMinutes + task.estimate_min <= availableMinutes) {
      queueTasks.push(task)
      scheduledMinutes += task.estimate_min
    } else {
      overflowTasks.push(task)
    }
  }
  
  const overflowMinutes = overflowTasks.reduce((sum, t) => sum + t.estimate_min, 0)
  
  return {
    availableMinutes,
    scheduledMinutes,
    overflowMinutes,
    isOverloaded: overflowMinutes > 0,
    queueTasks,
    overflowTasks
  }
}

/**
 * Generate overflow alert when adding a new task
 */
export function generateOverflowAlert(
  newTask: { title: string; estimate_min: number },
  analysis: CapacityAnalysis
): OverflowAlert | null {
  if (!analysis.isOverloaded) return null
  
  const overflowHours = Math.round(analysis.overflowMinutes / 60 * 10) / 10
  
  return {
    type: 'warning',
    title: `⚠️ Dzień przeciążony o ${overflowHours}h`,
    message: `Dodajesz "${newTask.title}" (${newTask.estimate_min}min) do dnia z ${Math.round(analysis.availableMinutes / 60)}h capacity.`,
    actions: [
      {
        label: '🔄 Rozłóż na 2 dni',
        action: 'SPLIT_TASK',
        data: { taskTitle: newTask.title }
      },
      {
        label: '📅 Przenieś inne zadania na jutro',
        action: 'MOVE_TO_TOMORROW',
        data: { tasks: analysis.overflowTasks }
      },
      {
        label: '⏱️ Zmniejsz estymat',
        action: 'REDUCE_ESTIMATE',
        data: { taskTitle: newTask.title }
      },
      {
        label: '✅ Dodaj mimo przeciążenia',
        action: 'CONFIRM_OVERLOAD'
      }
    ]
  }
}

/**
 * Generate alert for tasks pushed out
 */
export function generatePushedOutAlert(
  pushedOutTasks: TestDayTask[]
): OverflowAlert | null {
  if (pushedOutTasks.length === 0) return null
  
  return {
    type: 'info',
    title: `📋 ${pushedOutTasks.length} zadań przesunięto na "później"`,
    message: `Nowe zadanie wypycha z kolejki:\n${pushedOutTasks.map(t => '• ' + t.title).join('\n')}`,
    actions: [
      {
        label: '👁️ Zobacz',
        action: 'CONFIRM_OVERLOAD',
        data: { highlightTasks: pushedOutTasks }
      }
    ]
  }
}

/**
 * Calculate real total minutes (including overflow)
 */
export function calculateRealTotal(tasks: TestDayTask[]): number {
  return tasks.reduce((sum, t) => sum + t.estimate_min, 0)
}

/**
 * Format time display (e.g., "8h 30min")
 */
export function formatTimeDisplay(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}min`
}
