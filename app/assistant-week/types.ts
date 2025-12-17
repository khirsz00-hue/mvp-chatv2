export type WeekDayStatus = 'ok' | 'overloaded' | 'empty'

export interface WeekDaySummary {
  date: string
  label: string
  percentage: number
  status: WeekDayStatus
  tasksCount: number
  eventsCount: number
  totalMinutes: number
  warnings: string[]
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
