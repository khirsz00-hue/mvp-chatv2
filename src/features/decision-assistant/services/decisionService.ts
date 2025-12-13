import { supabase } from '@/lib/supabaseClient'
import { Decision, DecisionOption, DecisionEvent, HatColor } from '../types'

export class DecisionService {
  // Create a new decision
  static async createDecision(
    userId: string,
    title: string,
    description: string,
    options?: Array<{ title: string; description?: string }>
  ): Promise<Decision> {
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .insert({
        user_id: userId,
        title,
        description,
        status: 'draft',
        current_hat: null
      })
      .select()
      .single()

    if (decisionError) throw decisionError

    // Create options if provided
    if (options && options.length > 0) {
      const optionsToInsert = options.map((opt, index) => ({
        decision_id: decision.id,
        title: opt.title,
        description: opt.description || '',
        order: index
      }))

      const { error: optionsError } = await supabase
        .from('decision_options')
        .insert(optionsToInsert)

      if (optionsError) throw optionsError
    }

    return decision
  }

  // Get decision by ID with options
  static async getDecision(decisionId: string): Promise<{
    decision: Decision
    options: DecisionOption[]
  }> {
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', decisionId)
      .single()

    if (decisionError) throw decisionError

    const { data: options, error: optionsError } = await supabase
      .from('decision_options')
      .select('*')
      .eq('decision_id', decisionId)
      .order('order', { ascending: true })

    if (optionsError) throw optionsError

    return { decision, options: options || [] }
  }

  // Get all decisions for a user
  static async getUserDecisions(userId: string): Promise<Decision[]> {
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Update decision
  static async updateDecision(
    decisionId: string,
    updates: Partial<Decision>
  ): Promise<Decision> {
    const { data, error } = await supabase
      .from('decisions')
      .update(updates)
      .eq('id', decisionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update decision hat progress
  static async updateCurrentHat(
    decisionId: string,
    hatColor: HatColor | null
  ): Promise<Decision> {
    return this.updateDecision(decisionId, { current_hat: hatColor })
  }

  // Add decision event (analysis, user input, synthesis)
  static async addEvent(
    decisionId: string,
    hatColor: HatColor,
    eventType: 'analysis' | 'user_input' | 'synthesis',
    content: string,
    aiResponse?: string,
    metadata?: Record<string, any>
  ): Promise<DecisionEvent> {
    const { data, error } = await supabase
      .from('decision_events')
      .insert({
        decision_id: decisionId,
        hat_color: hatColor,
        event_type: eventType,
        content,
        ai_response: aiResponse,
        metadata
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get events for a decision
  static async getEvents(decisionId: string): Promise<DecisionEvent[]> {
    const { data, error } = await supabase
      .from('decision_events')
      .select('*')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Get events by hat color
  static async getEventsByHat(
    decisionId: string,
    hatColor: HatColor
  ): Promise<DecisionEvent[]> {
    const { data, error } = await supabase
      .from('decision_events')
      .select('*')
      .eq('decision_id', decisionId)
      .eq('hat_color', hatColor)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Delete decision
  static async deleteDecision(decisionId: string): Promise<void> {
    const { error } = await supabase
      .from('decisions')
      .delete()
      .eq('id', decisionId)

    if (error) throw error
  }

  // Add option to existing decision
  static async addOption(
    decisionId: string,
    title: string,
    description?: string
  ): Promise<DecisionOption> {
    // Get current max order
    const { data: options } = await supabase
      .from('decision_options')
      .select('order')
      .eq('decision_id', decisionId)
      .order('order', { ascending: false })
      .limit(1)

    const maxOrder = options && options.length > 0 ? options[0].order : -1

    const { data, error } = await supabase
      .from('decision_options')
      .insert({
        decision_id: decisionId,
        title,
        description: description || '',
        order: maxOrder + 1
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update option
  static async updateOption(
    optionId: string,
    updates: { title?: string; description?: string }
  ): Promise<DecisionOption> {
    const { data, error } = await supabase
      .from('decision_options')
      .update(updates)
      .eq('id', optionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delete option
  static async deleteOption(optionId: string): Promise<void> {
    const { error } = await supabase
      .from('decision_options')
      .delete()
      .eq('id', optionId)

    if (error) throw error
  }
}
