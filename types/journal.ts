// Types for Journal Assistant with ADHD-specific metrics

export interface JournalEntry {
  id: string
  user_id: string
  date: string // ISO date string (YYYY-MM-DD)
  energy: number // 0-10
  motivation: number // 0-10
  sleep_quality: number // 0-10
  hours_slept: number
  sleep_time?: string // HH:MM format (deprecated, kept for legacy data)
  wake_time?: string // HH:MM format (deprecated, kept for legacy data)
  planned_tasks?: string // deprecated, kept for legacy data
  completed_tasks_snapshot: string[]
  notes: string[]
  comments?: string[] // deprecated, kept for legacy data
  ai_summary?: string // deprecated, kept for legacy data
  created_at: string
  updated_at: string
  // Legacy fields for compatibility
  content?: string
  archived?: boolean
}

export interface TodoistTask {
  id: string
  content: string
  description?: string
  completed: boolean
  due?: {
    date: string
    datetime?: string
  }
  project_id?: string
  priority?: number
  labels?: string[]
}

export interface JournalStats {
  avgEnergy: number
  avgMotivation: number
  avgSleepQuality: number
  avgHoursSlept: number
  totalEntries: number
}

export interface ArchiveHierarchy {
  year: number
  months?: {
    month: number
    weeks?: {
      week: number
      days?: {
        day: string // ISO date
        entry: JournalEntry
      }[]
      stats: JournalStats
    }[]
    stats: JournalStats
  }[]
  stats: JournalStats
}

export interface AggregatedPeriod {
  period: string // "2025", "Styczeń 2025", "1-7 Sty 2025"
  entriesCount: number
  avgEnergy: number
  avgMotivation: number
  avgSleepQuality: number
  avgHoursSlept: number
  totalNotes: number
  totalCompletedTasks: number
  completionRate: number // 0-100%
  entries: JournalEntry[]
  key: string // unikalny klucz dla danego okresu
}
