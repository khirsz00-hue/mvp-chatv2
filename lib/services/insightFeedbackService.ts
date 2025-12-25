/**
 * Insight Feedback Service
 * Saves user feedback on passive insights to help improve recommendations
 */

import { createClient } from '@/lib/supabaseClient'
import { PassiveInsight } from './passiveInsightEngine'

export async function saveInsightFeedback(
  userId: string,
  insight: PassiveInsight,
  feedback: 'helpful' | 'not_helpful' | 'neutral'
): Promise<{ success: boolean; error?: string }> {
  
  const supabase = createClient()
  
  const { error } = await supabase
    .from('day_assistant_v2_recommendation_feedback')
    .insert({
      user_id: userId,
      recommendation_type: insight.type,
      recommendation_data: {
        title: insight.title,
        message: insight.message,
        metadata: insight.metadata,
        priority: insight.priority
      },
      feedback,
      created_at: new Date().toISOString()
    })
  
  if (error) {
    console.error('❌ [Insight Feedback] Error:', error)
    return { success: false, error: error.message }
  }
  
  console.log('✅ [Insight Feedback] Saved:', {
    type: insight.type,
    feedback
  })
  
  return { success: true }
}
