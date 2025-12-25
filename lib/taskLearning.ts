/**
 * Task Learning Module
 * AI learns from task completion history and suggests more accurate estimates
 */

import { supabase } from '@/lib/supabaseClient'

export interface TaskPattern {
  context_type: string
  cognitive_load: number
  avgMultiplier: number  // actual / estimate
  sampleSize: number
  confidence: 'low' | 'medium' | 'high'
}

export interface EstimateSuggestion {
  userEstimate: number
  aiSuggestion: number
  reasoning: string
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Analyze task completion patterns for a user
 * Groups by context_type and cognitive_load to find patterns
 */
export async function analyzeTaskPatterns(userId: string): Promise<TaskPattern[]> {
  try {
    // Query completed tasks with actual_duration
    const { data: completedTasks, error } = await supabase
      .from('day_assistant_v2_tasks')
      .select('context_type, cognitive_load, estimate_min, metadata')
      .eq('user_id', userId)
      .eq('completed', true)
      .not('metadata->actual_duration_min', 'is', null)
    
    if (error || !completedTasks) {
      console.warn('⚠️ [TaskLearning] Failed to fetch completed tasks:', error)
      return []
    }
    
    // Group by context_type and cognitive_load
    const patterns: Record<string, { estimates: number[], actuals: number[] }> = {}
    
    completedTasks.forEach(task => {
      const actualDuration = task.metadata?.actual_duration_min
      if (!actualDuration || !task.context_type || !task.cognitive_load) return
      
      const key = `${task.context_type}_${task.cognitive_load}`
      if (!patterns[key]) {
        patterns[key] = { estimates: [], actuals: [] }
      }
      patterns[key].estimates.push(task.estimate_min)
      patterns[key].actuals.push(actualDuration)
    })
    
    // Calculate multipliers
    return Object.entries(patterns).map(([key, data]) => {
      const [context_type, cognitive_load] = key.split('_')
      const avgEstimate = data.estimates.reduce((a, b) => a + b, 0) / data.estimates.length
      const avgActual = data.actuals.reduce((a, b) => a + b, 0) / data.actuals.length
      const multiplier = avgActual / avgEstimate
      
      return {
        context_type,
        cognitive_load: parseInt(cognitive_load),
        avgMultiplier: multiplier,
        sampleSize: data.estimates.length,
        confidence: data.estimates.length > 10 ? 'high' : data.estimates.length > 5 ? 'medium' : 'low'
      }
    })
  } catch (error) {
    console.error('❌ [TaskLearning] Error analyzing patterns:', error)
    return []
  }
}

/**
 * Suggest estimate based on learned patterns
 */
export function suggestEstimate(
  taskData: { context_type: string; cognitive_load: number; estimate_min: number },
  patterns: TaskPattern[]
): EstimateSuggestion | null {
  const pattern = patterns.find(p => 
    p.context_type === taskData.context_type && 
    p.cognitive_load === taskData.cognitive_load
  )
  
  if (pattern && pattern.confidence !== 'low') {
    const aiSuggestion = Math.round(taskData.estimate_min * pattern.avgMultiplier)
    
    // Only suggest if difference is significant (>20% or >5 minutes)
    const diff = Math.abs(aiSuggestion - taskData.estimate_min)
    const percentDiff = (diff / taskData.estimate_min) * 100
    
    if (percentDiff < 20 && diff < 5) {
      return null // Estimates are close enough
    }
    
    return {
      userEstimate: taskData.estimate_min,
      aiSuggestion,
      reasoning: `Na podstawie ${pattern.sampleSize} podobnych zadań ${pattern.context_type}`,
      confidence: pattern.confidence
    }
  }
  
  return null
}

/**
 * Record actual task duration after completion
 */
export async function recordActualDuration(
  taskId: string,
  actualDurationMin: number
): Promise<void> {
  try {
    // First, get current metadata
    const { data: task, error: fetchError } = await supabase
      .from('day_assistant_v2_tasks')
      .select('metadata')
      .eq('id', taskId)
      .single()
    
    if (fetchError) {
      console.error('❌ [TaskLearning] Failed to fetch task metadata:', fetchError)
      return
    }
    
    // Merge with existing metadata
    const updatedMetadata = {
      ...(task?.metadata || {}),
      actual_duration_min: actualDurationMin
    }
    
    const { error } = await supabase
      .from('day_assistant_v2_tasks')
      .update({
        metadata: updatedMetadata
      })
      .eq('id', taskId)
    
    if (error) {
      console.error('❌ [TaskLearning] Failed to record actual duration:', error)
    } else {
      console.log('✅ [TaskLearning] Recorded actual duration:', actualDurationMin)
    }
  } catch (error) {
    console.error('❌ [TaskLearning] Error recording duration:', error)
  }
}
