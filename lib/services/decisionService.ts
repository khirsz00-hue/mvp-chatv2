// Decision Service - Handles all Supabase operations for decisions
import { supabase } from '../supabaseClient'
import type {
  Decision,
  DecisionOption,
  DecisionEvent,
  DecisionWithOptions,
  CreateDecisionInput,
  UpdateDecisionInput,
  CreateOptionInput,
  DecisionEventType,
} from '../types/decisions'

// ============================================
// Decision CRUD Operations
// ============================================

/**
 * Create a new decision
 */
export async function createDecision(
  userId: string,
  input: CreateDecisionInput
): Promise<Decision | null> {
  const { data, error } = await supabase
    .from('decisions')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      context: input.context,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating decision:', error)
    return null
  }

  // Create a "created" event
  await createDecisionEvent(data.id, 'created', {
    title: input.title,
  })

  return data
}

/**
 * Get all decisions for a user
 */
export async function getUserDecisions(
  userId: string,
  includeArchived: boolean = false
): Promise<Decision[]> {
  let query = supabase
    .from('decisions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (!includeArchived) {
    query = query.neq('status', 'archived')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching decisions:', error)
    return []
  }

  return data || []
}

/**
 * Get a single decision by ID with options and events
 */
export async function getDecisionById(
  decisionId: string
): Promise<DecisionWithOptions | null> {
  const { data: decision, error: decisionError } = await supabase
    .from('decisions')
    .select('*')
    .eq('id', decisionId)
    .single()

  if (decisionError || !decision) {
    console.error('Error fetching decision:', decisionError)
    return null
  }

  // Fetch options
  const { data: options, error: optionsError } = await supabase
    .from('decision_options')
    .select('*')
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: true })

  // Fetch events
  const { data: events, error: eventsError } = await supabase
    .from('decision_events')
    .select('*')
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: true })

  return {
    ...decision,
    options: options || [],
    events: events || [],
  }
}

/**
 * Update a decision
 */
export async function updateDecision(
  decisionId: string,
  input: UpdateDecisionInput
): Promise<Decision | null> {
  const { data, error } = await supabase
    .from('decisions')
    .update(input)
    .eq('id', decisionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating decision:', error)
    return null
  }

  // Create status change event if status was updated
  if (input.status) {
    await createDecisionEvent(decisionId, 'status_changed', {
      new_status: input.status,
    })
  }

  // Create decision made event if decision was made
  if (input.decision_made) {
    await createDecisionEvent(decisionId, 'decision_made', {
      decision: input.decision_made,
      confidence_score: input.confidence_score,
    })
  }

  return data
}

/**
 * Delete a decision (cascade deletes options and events)
 */
export async function deleteDecision(decisionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('decisions')
    .delete()
    .eq('id', decisionId)

  if (error) {
    console.error('Error deleting decision:', error)
    return false
  }

  return true
}

// ============================================
// Decision Options CRUD Operations
// ============================================

/**
 * Add an option to a decision
 */
export async function addDecisionOption(
  input: CreateOptionInput
): Promise<DecisionOption | null> {
  const { data, error } = await supabase
    .from('decision_options')
    .insert({
      decision_id: input.decision_id,
      label: input.label,
      description: input.description,
      pros: input.pros,
      cons: input.cons,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding decision option:', error)
    return null
  }

  // Create event
  await createDecisionEvent(input.decision_id, 'option_added', {
    option_label: input.label,
  })

  return data
}

/**
 * Update an option
 */
export async function updateDecisionOption(
  optionId: string,
  updates: Partial<CreateOptionInput>
): Promise<DecisionOption | null> {
  const { data, error } = await supabase
    .from('decision_options')
    .update(updates)
    .eq('id', optionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating decision option:', error)
    return null
  }

  return data
}

/**
 * Delete an option
 */
export async function deleteDecisionOption(optionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('decision_options')
    .delete()
    .eq('id', optionId)

  if (error) {
    console.error('Error deleting decision option:', error)
    return false
  }

  return true
}

/**
 * Get options for a decision
 */
export async function getDecisionOptions(
  decisionId: string
): Promise<DecisionOption[]> {
  const { data, error } = await supabase
    .from('decision_options')
    .select('*')
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching decision options:', error)
    return []
  }

  return data || []
}

// ============================================
// Decision Events Operations
// ============================================

/**
 * Create a decision event
 */
export async function createDecisionEvent(
  decisionId: string,
  eventType: DecisionEventType,
  payload?: Record<string, any>,
  aiResponse?: string
): Promise<DecisionEvent | null> {
  const { data, error } = await supabase
    .from('decision_events')
    .insert({
      decision_id: decisionId,
      event_type: eventType,
      payload: payload || {},
      ai_response: aiResponse,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating decision event:', error)
    return null
  }

  return data
}

/**
 * Get events for a decision
 */
export async function getDecisionEvents(
  decisionId: string
): Promise<DecisionEvent[]> {
  const { data, error } = await supabase
    .from('decision_events')
    .select('*')
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching decision events:', error)
    return []
  }

  return data || []
}
