/**
 * AI Assistant Progress Service
 * 
 * Manages progress tracking for AI Task Breakdown Modal
 */

import { supabase } from '@/lib/supabaseClient'

export interface AIAssistantProgress {
  id: string
  user_id: string
  task_id: string
  mode: 'light' | 'stuck' | 'crisis'
  total_steps: number
  current_step_index: number
  subtask_ids: string[]
  completed_step_indices: number[]
  qa_context?: string | null
  created_at: string
  updated_at: string
}

/**
 * Get progress for a specific task
 */
export async function getProgress(userId: string, taskId: string): Promise<AIAssistantProgress | null> {
  const { data, error } = await supabase
    .from('ai_assistant_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null
    }
    console.error('Error fetching assistant progress:', error)
    return null
  }

  return data as AIAssistantProgress
}

/**
 * Create new progress entry
 */
export async function createProgress(
  userId: string,
  taskId: string,
  mode: 'light' | 'stuck' | 'crisis',
  totalSteps: number,
  qaContext?: string
): Promise<AIAssistantProgress | null> {
  const { data, error } = await supabase
    .from('ai_assistant_progress')
    .insert({
      user_id: userId,
      task_id: taskId,
      mode: mode,
      total_steps: totalSteps,
      current_step_index: 0,
      subtask_ids: [],
      completed_step_indices: [],
      qa_context: qaContext || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating assistant progress:', error)
    return null
  }

  return data as AIAssistantProgress
}

/**
 * Update progress (current step, completed steps, subtask IDs)
 */
export async function updateProgress(
  progressId: string,
  updates: {
    current_step_index?: number
    subtask_ids?: string[]
    completed_step_indices?: number[]
  }
): Promise<AIAssistantProgress | null> {
  const { data, error } = await supabase
    .from('ai_assistant_progress')
    .update(updates)
    .eq('id', progressId)
    .select()
    .single()

  if (error) {
    console.error('Error updating assistant progress:', error)
    return null
  }

  return data as AIAssistantProgress
}

/**
 * Mark a step as completed and advance to next
 */
export async function completeStep(
  progressId: string,
  stepIndex: number,
  subtaskId?: string
): Promise<AIAssistantProgress | null> {
  // First fetch current progress
  const { data: current, error: fetchError } = await supabase
    .from('ai_assistant_progress')
    .select('*')
    .eq('id', progressId)
    .single()

  if (fetchError || !current) {
    console.error('Error fetching current progress:', fetchError)
    return null
  }

  const completedIndices = [...(current.completed_step_indices || []), stepIndex]
  const subtaskIds = subtaskId 
    ? [...(current.subtask_ids || []), subtaskId]
    : current.subtask_ids || []
  
  // Move to next step if not already past it
  const nextStepIndex = stepIndex + 1

  const { data, error } = await supabase
    .from('ai_assistant_progress')
    .update({
      current_step_index: nextStepIndex,
      completed_step_indices: completedIndices,
      subtask_ids: subtaskIds
    })
    .eq('id', progressId)
    .select()
    .single()

  if (error) {
    console.error('Error completing step:', error)
    return null
  }

  return data as AIAssistantProgress
}

/**
 * Delete progress (when user cancels)
 */
export async function deleteProgress(progressId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_assistant_progress')
    .delete()
    .eq('id', progressId)

  if (error) {
    console.error('Error deleting progress:', error)
    return false
  }

  return true
}

/**
 * Add subtask ID to progress
 */
export async function addSubtaskToProgress(
  progressId: string,
  subtaskId: string
): Promise<AIAssistantProgress | null> {
  // Fetch current progress
  const { data: current, error: fetchError } = await supabase
    .from('ai_assistant_progress')
    .select('*')
    .eq('id', progressId)
    .single()

  if (fetchError || !current) {
    console.error('Error fetching current progress:', fetchError)
    return null
  }

  const subtaskIds = [...(current.subtask_ids || []), subtaskId]

  const { data, error } = await supabase
    .from('ai_assistant_progress')
    .update({ subtask_ids: subtaskIds })
    .eq('id', progressId)
    .select()
    .single()

  if (error) {
    console.error('Error adding subtask to progress:', error)
    return null
  }

  return data as AIAssistantProgress
}
