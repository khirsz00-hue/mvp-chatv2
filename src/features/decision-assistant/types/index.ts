// Types for Decision Assistant (Six Thinking Hats)

export type HatColor = 'blue' | 'white' | 'red' | 'black' | 'yellow' | 'green'

export type DecisionStatus = 'draft' | 'in_progress' | 'completed'

export interface UserInputQuestion {
  id: string
  question: string
  answer: string
}

export interface UserInputContent {
  questions?: UserInputQuestion[]
  additionalThoughts?: string
  skipped?: boolean
}

export interface Decision {
  id: string
  user_id: string
  title: string
  description: string
  status: DecisionStatus
  current_hat: HatColor | null
  created_at: string
  updated_at: string
}

export interface DecisionOption {
  id: string
  decision_id: string
  title: string
  description?: string | null
  order: number
  created_at: string
}

export type EventType = 'analysis' | 'user_input' | 'synthesis'

export interface DecisionEvent {
  id: string
  decision_id: string
  hat_color: HatColor
  event_type: EventType
  content: string
  ai_response?: string | null
  metadata?: any
  created_at: string
}

export interface DecisionWithOptions extends Decision {
  options: DecisionOption[]
  events?: DecisionEvent[]
}
