import { DecisionEvent } from '../types'

/**
 * Checks if a decision event contains real user input (non-empty answers)
 * @param event - The decision event to check
 * @returns true if the event has real user answers, false otherwise
 */
export function hasRealUserInput(event: DecisionEvent): boolean {
  if (event.event_type !== 'user_input') return false
  if (!event.content) return false
  
  try {
    const content = JSON.parse(event.content)
    
    // Check if has any non-empty answers
    const hasAnswers = content.questions?.some((q: any) => q.answer?.trim()) 
      || content.additionalThoughts?.trim()
    
    return hasAnswers
  } catch {
    return false
  }
}

/**
 * Checks if any events in the array contain real user input
 * @param events - Array of decision events
 * @returns true if at least one event has real user answers
 */
export function hasAnyRealUserInput(events: DecisionEvent[]): boolean {
  return events.some(hasRealUserInput)
}

/**
 * Filters events to only include those with real user input
 * @param events - Array of decision events
 * @returns Array of events that contain real user answers
 */
export function filterRealUserInputEvents(events: DecisionEvent[]): DecisionEvent[] {
  return events.filter(hasRealUserInput)
}
