export type WeekDayStatus = 'ok' | 'overloaded' | 'empty'

export interface WeekTaskDetail {
  id: string
  title: string
  dueDate: string | null
  estimatedDuration: number
  priority?: string | null
  completed: boolean
}

export interface WeekEventDetail {
  id: string
  title: string
  date: string
  startTime?: string | null
  endTime?: string | null
  durationMinutes: number
  type: string
}

export interface WeekDaySummary {
  date: string
  label: string
  percentage: number
  status: WeekDayStatus
  tasksCount: number
  eventsCount: number
  totalMinutes: number
  warnings: string[]
  tasks: WeekTaskDetail[]
  events: WeekEventDetail[]
}

export interface WeekRecommendation {
  id: string
  title: string
  explanation: string
  type: string
  payload: Record<string, any>
  status: 'pending' | 'applied' | 'rejected'
  applied: boolean
}

export interface WeekSnapshot {
  authenticated: boolean
  weekStart: string
  capacityMinutes: number
  days: WeekDaySummary[]
  analysisText: string
  recommendations: WeekRecommendation[]
}
