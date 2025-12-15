/**
 * Timeline Engine - Scheduling logic for Day Assistant
 * 
 * Handles collision detection, buffer management, and timeline manipulation
 */

import { addMinutes, parseISO, format } from 'date-fns'
import { getContextBuffer, ContextType } from './DayContext'

export interface TimelineEvent {
  id: string
  type: 'meeting' | 'event' | 'task-block' | 'ghost-proposal'
  start: string  // ISO string
  end: string    // ISO string
  duration: number
  mutable: boolean  // can be moved
  context?: ContextType
}

export interface ScheduleConflict {
  event1: TimelineEvent
  event2: TimelineEvent
  overlapMinutes: number
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(event1: TimelineEvent, event2: TimelineEvent): boolean {
  const start1 = new Date(event1.start).getTime()
  const end1 = new Date(event1.end).getTime()
  const start2 = new Date(event2.start).getTime()
  const end2 = new Date(event2.end).getTime()

  return start1 < end2 && start2 < end1
}

/**
 * Find all conflicts in a timeline
 */
export function findConflicts(events: TimelineEvent[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsOverlap(events[i], events[j])) {
        const start1 = new Date(events[i].start).getTime()
        const end1 = new Date(events[i].end).getTime()
        const start2 = new Date(events[j].start).getTime()
        const end2 = new Date(events[j].end).getTime()

        const overlapStart = Math.max(start1, start2)
        const overlapEnd = Math.min(end1, end2)
        const overlapMinutes = (overlapEnd - overlapStart) / 60000

        conflicts.push({
          event1: events[i],
          event2: events[j],
          overlapMinutes
        })
      }
    }
  }

  return conflicts
}

/**
 * Find next available slot for a task
 */
export function findNextSlot(
  events: TimelineEvent[],
  durationMinutes: number,
  workingHours: { start: number; end: number },
  afterTime?: string,  // ISO string, optional
  bufferMinutes: number = 15
): { start: string; end: string } | null {
  const now = afterTime ? new Date(afterTime) : new Date()
  const today = new Date(now)
  today.setHours(workingHours.start, 0, 0, 0)

  const endOfDay = new Date(today)
  endOfDay.setHours(workingHours.end, 0, 0, 0)

  // Start searching from max(now, start of working hours)
  let searchStart = new Date(Math.max(now.getTime(), today.getTime()))

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  // Try to fit task in gaps between events
  for (const event of sortedEvents) {
    const eventStart = new Date(event.start)
    const gapMinutes = (eventStart.getTime() - searchStart.getTime()) / 60000

    // Check if task fits in this gap (with buffer)
    if (gapMinutes >= durationMinutes + bufferMinutes) {
      const slotEnd = addMinutes(searchStart, durationMinutes)
      return {
        start: searchStart.toISOString(),
        end: slotEnd.toISOString()
      }
    }

    // Move search start to after this event (with buffer)
    searchStart = addMinutes(new Date(event.end), bufferMinutes)
  }

  // Check if there's space at the end of the day
  const finalGapMinutes = (endOfDay.getTime() - searchStart.getTime()) / 60000
  if (finalGapMinutes >= durationMinutes) {
    const slotEnd = addMinutes(searchStart, durationMinutes)
    return {
      start: searchStart.toISOString(),
      end: slotEnd.toISOString()
    }
  }

  return null
}

/**
 * Move a task block to a new time slot
 */
export function moveTaskBlock(
  event: TimelineEvent,
  newStartTime: string,
  timeline: TimelineEvent[]
): { success: boolean; conflicts: ScheduleConflict[] } {
  if (!event.mutable) {
    return { success: false, conflicts: [] }
  }

  const newStart = new Date(newStartTime)
  const newEnd = addMinutes(newStart, event.duration)

  const movedEvent: TimelineEvent = {
    ...event,
    start: newStart.toISOString(),
    end: newEnd.toISOString()
  }

  // Check for conflicts with other events
  const otherEvents = timeline.filter(e => e.id !== event.id)
  const conflicts: ScheduleConflict[] = []

  for (const other of otherEvents) {
    if (eventsOverlap(movedEvent, other)) {
      const start1 = newStart.getTime()
      const end1 = newEnd.getTime()
      const start2 = new Date(other.start).getTime()
      const end2 = new Date(other.end).getTime()

      const overlapStart = Math.max(start1, start2)
      const overlapEnd = Math.min(end1, end2)
      const overlapMinutes = (overlapEnd - overlapStart) / 60000

      conflicts.push({
        event1: movedEvent,
        event2: other,
        overlapMinutes
      })
    }
  }

  return {
    success: conflicts.length === 0,
    conflicts
  }
}

/**
 * Create a task block for grouped tasks
 */
export function createTaskBlock(
  taskIds: string[],
  taskTitles: string[],
  totalDuration: number,
  context: ContextType,
  timeline: TimelineEvent[],
  workingHours: { start: number; end: number }
): TimelineEvent | null {
  const buffer = getContextBuffer(context)
  const slot = findNextSlot(timeline, totalDuration, workingHours, undefined, buffer)

  if (!slot) return null

  const blockTitle = `${taskTitles[0]}${taskIds.length > 1 ? ` + ${taskIds.length - 1} więcej` : ''}`

  return {
    id: `block_${Date.now()}`,
    type: 'task-block',
    start: slot.start,
    end: slot.end,
    duration: totalDuration,
    mutable: true,
    context
  }
}

/**
 * Add buffer time after an event
 */
export function addBufferAfterEvent(
  event: TimelineEvent,
  bufferMinutes: number = 15
): { start: string; end: string } {
  const eventEnd = new Date(event.end)
  const bufferEnd = addMinutes(eventEnd, bufferMinutes)

  return {
    start: eventEnd.toISOString(),
    end: bufferEnd.toISOString()
  }
}

/**
 * Check if a time slot is within working hours
 */
export function isWithinWorkingHours(
  startTime: string,
  endTime: string,
  workingHours: { start: number; end: number }
): boolean {
  const start = new Date(startTime)
  const end = new Date(endTime)

  const startHour = start.getHours()
  const endHour = end.getHours()

  return (
    startHour >= workingHours.start &&
    endHour <= workingHours.end
  )
}

/**
 * Get time until next fixed event (meeting)
 */
export function getTimeUntilNextEvent(
  timeline: TimelineEvent[],
  currentTime: string = new Date().toISOString()
): number | null {
  const now = new Date(currentTime).getTime()
  const upcomingEvents = timeline
    .filter(e => e.type === 'meeting' && new Date(e.start).getTime() > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  if (upcomingEvents.length === 0) return null

  const nextEvent = upcomingEvents[0]
  const minutesUntil = (new Date(nextEvent.start).getTime() - now) / 60000

  return Math.floor(minutesUntil)
}

/**
 * Recommend task based on time until next meeting
 */
export function recommendTaskByAvailableTime(
  tasks: Array<{ id: string; title: string; duration: number }>,
  minutesAvailable: number
): { taskId: string; reason: string } | null {
  // Filter tasks that fit in available time (with some buffer)
  const fittingTasks = tasks.filter(t => t.duration <= minutesAvailable * 0.8)

  if (fittingTasks.length === 0) {
    return null
  }

  // For short windows (< 45 min), prefer shorter tasks
  if (minutesAvailable < 45) {
    const shortTasks = fittingTasks.filter(t => t.duration <= 20)
    if (shortTasks.length > 0) {
      return {
        taskId: shortTasks[0].id,
        reason: `${minutesAvailable} min do spotkania - krótkie zadanie`
      }
    }
  }

  // For longer windows, prefer tasks that use time efficiently
  const optimal = fittingTasks.reduce((best, task) =>
    Math.abs(task.duration - minutesAvailable * 0.7) < Math.abs(best.duration - minutesAvailable * 0.7)
      ? task
      : best
  )

  return {
    taskId: optimal.id,
    reason: `${minutesAvailable} min dostępne - optymalne wykorzystanie`
  }
}
