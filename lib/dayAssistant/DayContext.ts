/**
 * Day Context - Runtime state for Day Assistant
 * 
 * Tracks current state of the day including energy, momentum, active tasks, and available time windows
 */

import { EnergyMode } from '@/lib/types/dayAssistant'

export type Momentum = 'stuck' | 'neutral' | 'flow'
export type ContextType = 'deep' | 'admin' | 'comms' | 'ops' | 'creative' | 'unknown'

export interface TimeWindow {
  start: string  // ISO string
  end: string    // ISO string
  minutes: number
}

export interface NextFixedEvent {
  start: string
  end: string
  title: string
}

export interface DayContext {
  dateKey: string          // 'YYYY-MM-DD'
  now: string              // ISO string
  energyMode: EnergyMode   // 'crisis' | 'normal' | 'flow'
  momentum: Momentum       // inferred from recent activity
  activeTaskId?: string
  activeBlockId?: string
  activeContext?: ContextType
  nextFixedEvent?: NextFixedEvent
  availableWindows: TimeWindow[]
  overloadScore: number    // 0-100
}

/**
 * Infer momentum from recent task completion and timer events
 */
export function inferMomentum(
  recentCompletions: number,
  recentInterruptions: number,
  timeSinceLastAction: number  // minutes
): Momentum {
  // Stuck: interruptions > completions, or long time since last action
  if (recentInterruptions > recentCompletions || timeSinceLastAction > 90) {
    return 'stuck'
  }
  
  // Flow: 2+ completions with minimal interruptions
  if (recentCompletions >= 2 && recentInterruptions === 0) {
    return 'flow'
  }
  
  return 'neutral'
}

/**
 * Infer context type from task title and description
 */
export function inferContextType(title: string, description?: string): ContextType {
  const text = `${title} ${description || ''}`.toLowerCase()
  
  if (text.match(/email|slack|message|odpowiedz|napisz|komunikacja/)) {
    return 'comms'
  }
  
  if (text.match(/code|develop|program|debug|implement|fix bug|refactor/)) {
    return 'deep'
  }
  
  if (text.match(/admin|faktur|paperwork|dokument|formul|wypełn/)) {
    return 'admin'
  }
  
  if (text.match(/design|creative|brainstorm|ideation|concept|projekt/)) {
    return 'creative'
  }
  
  if (text.match(/meeting|call|spotkanie|prezentacja|rozmowa/)) {
    return 'ops'
  }
  
  return 'unknown'
}

/**
 * Calculate overload score based on tasks, deadlines, and available time
 */
export function calculateOverloadScore(
  totalTaskMinutes: number,
  availableMinutes: number,
  urgentTaskCount: number
): number {
  // Base score: ratio of required time to available time
  const timeRatio = totalTaskMinutes / Math.max(availableMinutes, 1)
  const baseScore = Math.min(timeRatio * 50, 70)
  
  // Add points for urgent tasks
  const urgencyScore = Math.min(urgentTaskCount * 10, 30)
  
  const total = Math.min(baseScore + urgencyScore, 100)
  return Math.round(total)
}

/**
 * Find available time windows in a day
 */
export function findAvailableWindows(
  workingHours: { start: number; end: number },  // e.g., { start: 9, end: 17 }
  existingEvents: Array<{ start: string; end: string }>,
  minWindowMinutes: number = 15
): TimeWindow[] {
  const windows: TimeWindow[] = []
  const today = new Date()
  today.setHours(workingHours.start, 0, 0, 0)
  
  const endTime = new Date(today)
  endTime.setHours(workingHours.end, 0, 0, 0)
  
  // Sort events by start time
  const sortedEvents = [...existingEvents].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  )
  
  let currentTime = today
  
  for (const event of sortedEvents) {
    const eventStart = new Date(event.start)
    
    // Check if there's a gap before this event
    const gapMinutes = (eventStart.getTime() - currentTime.getTime()) / 60000
    
    if (gapMinutes >= minWindowMinutes) {
      windows.push({
        start: currentTime.toISOString(),
        end: eventStart.toISOString(),
        minutes: Math.floor(gapMinutes)
      })
    }
    
    // Move current time to end of this event
    currentTime = new Date(event.end)
  }
  
  // Check if there's time after last event
  const finalGapMinutes = (endTime.getTime() - currentTime.getTime()) / 60000
  if (finalGapMinutes >= minWindowMinutes) {
    windows.push({
      start: currentTime.toISOString(),
      end: endTime.toISOString(),
      minutes: Math.floor(finalGapMinutes)
    })
  }
  
  return windows
}

/**
 * Get buffer minutes based on context type
 */
export function getContextBuffer(context: ContextType): number {
  const buffers: Record<ContextType, number> = {
    deep: 10,      // Deep work needs buffer for context switching
    admin: 5,      // Admin tasks can be quick
    comms: 5,      // Communication is quick
    ops: 15,       // Operations/meetings need more buffer
    creative: 10,  // Creative work needs buffer
    unknown: 10    // Default buffer
  }
  
  return buffers[context]
}
