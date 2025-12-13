// Types for Decision Assistant

export type DecisionStatus = 'pending' | 'analyzing' | 'analyzed' | 'decided' | 'archived'

export type HatColor = 'blue' | 'white' | 'red' | 'black' | 'yellow' | 'green'

export type DecisionEventType = 
  | 'created' 
  | 'option_added' 
  | 'ai_analysis' 
  | 'status_changed' 
  | 'decision_made' 
  | 'note_added'
  | 'hat_analysis'
  | 'synthesis'

export interface HatAnswer {
  hat: HatColor
  questions?: string[]
  userAnswer?: string
  aiAnalysis?: string
  timestamp: string
}

export interface Decision {
  id: string
  user_id: string
  title: string
  description?: string
  context?: string
  status: DecisionStatus
  decision_made?: string
  confidence_score?: number
  current_hat?: HatColor | null
  hat_answers?: HatAnswer[]
  created_at: string
  updated_at: string
}

export interface DecisionOption {
  id: string
  decision_id: string
  label: string
  description?: string
  pros?: string[]
  cons?: string[]
  score?: number
  metadata?: Record<string, any>
  created_at: string
}

export interface DecisionEvent {
  id: string
  decision_id: string
  event_type: DecisionEventType
  payload?: Record<string, any>
  ai_response?: string
  created_at: string
}

export interface DecisionWithOptions extends Decision {
  options: DecisionOption[]
  events?: DecisionEvent[]
}

export interface CreateDecisionInput {
  title: string
  description?: string
  context?: string
}

export interface UpdateDecisionInput {
  title?: string
  description?: string
  context?: string
  status?: DecisionStatus
  decision_made?: string
  confidence_score?: number
  current_hat?: HatColor | null
  hat_answers?: HatAnswer[]
}

export interface CreateOptionInput {
  decision_id: string
  label: string
  description?: string
  pros?: string[]
  cons?: string[]
}

export interface AIAnalysisRequest {
  decision: Decision
  options: DecisionOption[]
  analysisType?: 'pros_cons' | 'risk_assessment' | 'recommendation' | 'full'
}

export interface AIAnalysisResponse {
  analysis: string
  recommendation?: string
  optionScores?: Record<string, number>
  confidence?: number
  reasoning?: string
}

// Six Thinking Hats specific types
export interface HatPrompt {
  color: HatColor
  emoji: string
  title: string
  description: string
  systemPrompt: string
  userPromptTemplate: string
}

export interface SixHatsAnalysis {
  questions: string[]
  analysis?: string
}

export interface SixHatsSynthesis {
  summary: string
  options?: string[]
  recommendation?: string
  nextSteps?: string[]
  facts?: string[]
  emotions?: string[]
  risks?: string[]
  benefits?: string[]
  ideas?: string[]
}
