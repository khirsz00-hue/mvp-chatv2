export interface Task {
  id: string
  content: string
  due?: string | null
  project?: string | null
  completed?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export interface AssistantSession {
  id: string
  title: string
  assistant: 'todoist' | 'six_hats'
  created_at?: string
}
