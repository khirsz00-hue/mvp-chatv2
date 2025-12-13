// Types for Decision Assistant

export type DecisionStatus = 'pending' | 'analyzing' | 'analyzed' | 'decided' | 'archived'

export type DecisionEventType = 
  | 'created' 
  | 'option_added' 
  | 'ai_analysis' 
  | 'status_changed' 
  | 'decision_made' 
  | 'note_added'

export interface Decision {
  id: string
  user_id: string
  title: string
  description?: string
  context?: string
  status: DecisionStatus
  decision_made?: string
  confidence_score?: number
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
