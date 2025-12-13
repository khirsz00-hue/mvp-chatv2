// Decision Assistant Types
// Based on Six Thinking Hats methodology

export type HatColor = 'blue' | 'white' | 'red' | 'black' | 'yellow' | 'green'

export interface Decision {
  id: string
  user_id: string
  title: string
  description: string
  status: 'draft' | 'in_progress' | 'completed'
  current_hat?: HatColor | null
  created_at: string
  updated_at: string
}

export interface DecisionOption {
  id: string
  decision_id: string
  title: string
  description?: string
  order: number
  created_at: string
}

export interface DecisionEvent {
  id: string
  decision_id: string
  hat_color: HatColor
  event_type: 'analysis' | 'user_input' | 'synthesis'
  content: string
  ai_response?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface HatPrompt {
  color: HatColor
  emoji: string
  title: string
  description: string
  systemPrompt: string
  userPromptTemplate: string
}

export interface DecisionAnalysis {
  decision_id: string
  hat_color: HatColor
  analysis: string
  key_points: string[]
  timestamp: string
}

export interface DecisionSynthesis {
  decision_id: string
  facts: string[]
  emotions: string[]
  risks: string[]
  benefits: string[]
  ideas: string[]
  action_plan: string
  recommendation: string
  created_at: string
}
