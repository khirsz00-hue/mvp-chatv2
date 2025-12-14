import { supabase } from '@/lib/supabaseClient'
import { Decision, DecisionOption, DecisionEvent, HatColor } from '../types'

export class DecisionService {
  static async createDecision(
    userId: string,
    title: string,
    description: string,
    options?: Array<{ title: string; description?: string }>
  ): Promise<Decision> {
    const { data: decision, error } = await supabase
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

    if (error) {
      console.error('Error creating decision:', error)
      throw new Error(`Failed to create decision: ${error.message}`)
    }

    if (options && options.length > 0) {
      const validOptions = options.filter(opt => opt.title.trim())
      
      if (validOptions.length > 0) {
        const optionsToInsert = validOptions.map((opt, index) => ({
          decision_id: decision.id,
          title: opt.title.trim(),
          description: opt.description?.trim() || null,
          order: index
        }))

        const { error: optionsError } = await supabase
          .from('decision_options')
          .insert(optionsToInsert)

        if (optionsError) {
          console.error('Error creating options:', optionsError)
        }
      }
    }

    return decision
  }

  static async getDecision(id: string): Promise<{ decision: Decision; options: DecisionOption[] }> {
    const { data: decision, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`Failed to get decision: ${error.message}`)
    }

    const { data: options } = await supabase
      .from('decision_options')
      .select('*')
      .eq('decision_id', id)
      .order('order', { ascending: true })

    return { decision, options: options || [] }
  }

  static async updateDecision(id: string, updates: Partial<Decision>): Promise<Decision> {
    const { data, error } = await supabase
      .from('decisions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update decision: ${error.message}`)
    }

    return data
  }

  static async updateCurrentHat(id: string, hatColor: HatColor | null): Promise<void> {
    await this.updateDecision(id, { current_hat: hatColor })
  }

  static async deleteDecision(id: string): Promise<void> {
    const { error } = await supabase
      .from('decisions')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete decision: ${error.message}`)
    }
  }

  static async addEvent(
    decisionId: string,
    hatColor: HatColor,
    eventType: 'analysis' | 'user_input' | 'synthesis',
    content: string,
    aiResponse?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('decision_events')
      .insert({
        decision_id: decisionId,
        hat_color: hatColor,
        event_type: eventType,
        content,
        ai_response: aiResponse || null
      })

    if (error) {
      console.error('Error adding event:', error)
      throw new Error(`Failed to add event: ${error.message}`)
    }
  }

  static async getEvents(decisionId: string): Promise<DecisionEvent[]> {
    const { data, error } = await supabase
      .from('decision_events')
      .select('*')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get events: ${error.message}`)
    }

    return data || []
  }

  static async getEventsByHat(decisionId: string, hatColor: HatColor): Promise<DecisionEvent[]> {
    const { data, error } = await supabase
      .from('decision_events')
      .select('*')
      .eq('decision_id', decisionId)
      .eq('hat_color', hatColor)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get events by hat: ${error.message}`)
    }

    return data || []
  }
}
