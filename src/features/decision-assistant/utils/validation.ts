import { DecisionEvent, UserInputContent } from '../types'

/**
 * Checks if a decision event contains real user input (non-empty answers)
 * @param event - The decision event to check
 * @returns true if the event has real user answers, false otherwise
 */
export function hasRealUserInput(event: DecisionEvent): boolean {
  if (event.event_type !== 'user_input') return false
  if (!event.content) return false
  
  try {
    const content: UserInputContent = JSON.parse(event.content)
    
    // Check if has any non-empty answers in questions
    const hasQuestionAnswers = content.questions?.some((q) => {
      return q.answer && q.answer.trim().length > 0
    }) ?? false
    
    // Check if has additional thoughts
    const hasAdditionalThoughts = content.additionalThoughts 
      ? content.additionalThoughts.trim().length > 0 
      : false
    
    return hasQuestionAnswers || hasAdditionalThoughts
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
