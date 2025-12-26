/**
 * Day Assistant v2 - Type Definitions
 * Types for the enhanced day planner with ADHD-friendly features
 */

// Context Type - AI-powered smart categories
export type ContextType = 
  | 'deep_work'        // Deep focus coding, architecture, complex problem solving
  | 'communication'    // Meetings, emails, calls, Slack responses
  | 'admin'            // Bureaucracy, invoices, documentation, setup
  | 'creative'         // Design, writing, brainstorming, planning
  | 'learning'         // Reading docs, tutorials, research
  | 'maintenance'      // Bug fixes, code review, refactoring
  | 'personal'         // Personal errands, shopping, health
  | 'quick_wins'       // Small tasks < 15 min, easy completions
  // Legacy contexts (for backward compatibility)
  | 'code'            // Maps to 'deep_work'
  | 'komunikacja'     // Maps to 'communication'
  | 'prywatne'        // Maps to 'personal'

// Energy/Focus Preset
export interface EnergyFocusPreset {
  name: string
  energy: number
  focus: number
  description?: string
}

// Default Energy/Focus Presets
export const ENERGY_FOCUS_PRESETS: Record<string, EnergyFocusPreset> = {
  crisis: {
    name: '🔴 Kryzys',
    energy: 1,
    focus: 1,
    description: 'Minimum energii, maksimum łagodności'
  },
  low: {
    name: '🟡 Niskie',
    energy: 2,
    focus: 2,
    description: 'Zadania lekkie, bez dużych wyzwań'
  },
  normal: {
    name: '🟢 Normalne',
    energy: 3,
    focus: 3,
    description: 'Standardowy dzień pracy'
  },
  high: {
    name: '🚀 Wysoka',
    energy: 4,
    focus: 4,
    description: 'Gotowy na trudniejsze zadania'
  },
  flow: {
    name: '⚡ Flow',
    energy: 5,
    focus: 5,
    description: 'Maksymalna koncentracja i energia'
  }
}

// Assistant Settings
export interface AssistantSettings {
  undo_window?: number  // in seconds, default 10
  max_postpones?: number  // default 3
  max_postpones_before_escalation?: number  // default 3
  morning_must_block?: boolean  // default true
  morning_must_block_default?: number  // in minutes, default 60
  auto_decompose_threshold?: number  // in minutes, default 60
  energy_reminder_interval?: number  // in minutes
  focus_reminder_interval?: number  // in minutes
  light_task_limit_minutes?: number  // in minutes, default 90
}

// Default settings constant
export const DEFAULT_SETTINGS: AssistantSettings = {
  undo_window: 10,
  max_postpones: 3,
  max_postpones_before_escalation: 3,
  morning_must_block: true,
  morning_must_block_default: 60,
  auto_decompose_threshold: 60,
  energy_reminder_interval: 120,
  focus_reminder_interval: 90,
  light_task_limit_minutes: 90
}

// Assistant Configuration
export interface AssistantConfig {
  id: string
  user_id: string
  name: string
  type: 'day_planner' | 'week_planner' | 'journal' | 'decision'
  settings: AssistantSettings
  is_active: boolean
  created_at: string
  updated_at: string
}

// Test Day Assistant Task
export interface TestDayTask {
  id: string
  user_id: string
  assistant_id: string
  todoist_task_id?: string | null
  todoist_id?: string | null
  title: string
  description?: string | null
  priority: number  // Todoist priority
  is_must: boolean  // MUST task (max 1-3 per day)
  is_important: boolean
  estimate_min: number
  cognitive_load: number  // 1-5: 1=light, 5=heavy
  tags: string[]
  context_type?: string | null  // 'code', 'admin', 'komunikacja', 'prywatne'
  due_date?: string | null  // DATE
  completed: boolean
  completed_at?: string | null
  position: number
  // ADHD-friendly postpone tracking
  postpone_count: number
  moved_from_date?: string | null
  moved_reason?: string | null
  last_moved_at?: string | null
  auto_moved: boolean
  // Metadata
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Optional subtasks (populated when fetching with subtasks)
  subtasks?: TestDaySubtask[]
}

// Subtask
export interface TestDaySubtask {
  id: string
  task_id: string
  content: string
  estimated_duration: number  // in minutes
  completed: boolean
  completed_at?: string | null
  position: number
  created_at: string
}

// Day Plan (timeline blocks for specific date)
export interface DayPlan {
  id: string
  user_id: string
  assistant_id: string
  plan_date: string  // DATE
  energy: number  // 1-5
  focus: number  // 1-5
  blocks: TimeBlock[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Time Block
export interface TimeBlock {
  type: string  // 'task', 'break', 'buffer'
  task_id?: string
  start: string  // TIME or ISO timestamp
  end: string  // TIME or ISO timestamp
  locked: boolean
}

// Proposal Action
export interface ProposalAction {
  type: string  // 'move_task', 'split_task', 'defer_task', 'mark_must'
  task_id?: string
  from_date?: string
  to_date?: string
  reason?: string
  metadata?: Record<string, any>
}

// Proposal (recommendation with alternatives)
export interface Proposal {
  id: string
  user_id: string
  assistant_id: string
  plan_date: string  // DATE
  reason: string  // AI-generated explanation
  primary_action: ProposalAction
  alternatives: ProposalAction[]
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  created_at: string
  expires_at: string
  responded_at?: string | null
}

// Decision Context
export interface DecisionContext {
  energy?: number
  focus?: number
  time_of_day?: string
  postpone_count?: number
  reserve_morning?: boolean
  undo_entry_id?: string
  [key: string]: any
}

// Decision Log Entry
export interface DecisionLogEntry {
  id: string
  user_id: string
  assistant_id: string
  task_id?: string | null
  action: string  // 'postpone', 'unmark_must', 'accept_proposal', 'reject_proposal', 'undo'
  from_date?: string | null
  to_date?: string | null
  reason?: string | null
  context: DecisionContext
  timestamp: string
}

// Undo History Entry
export interface UndoHistoryEntry {
  id: string
  user_id: string
  assistant_id: string
  decision_log_id: string
  previous_state: Record<string, any>
  undo_window_expires: string
  undone: boolean
  undone_at?: string | null
  created_at: string
}

// Task Scoring
export interface ScoreBreakdown {
  base_score: number
  fit_bonus: number
  avoidance_penalty: number
  final_score: number
}

export interface TaskScore {
  task_id: string
  score: number
  breakdown: ScoreBreakdown
}

// Detailed Score Factor (for tooltip breakdown)
export interface ScoreFactor {
  name: string
  points: number
  positive: boolean
  detail: string
  explanation?: string  // NEW: Human-readable context for why this factor matters
}

// Detailed Score Breakdown (for tooltip display)
export interface DetailedScoreBreakdown {
  total: number
  factors: ScoreFactor[]
  explanation: string
  summary?: string  // NEW: Overall explanation of why this task has its current position
}

// Recommendation Action (for new recommendation system)
export interface RecommendationAction {
  op: 'REORDER_TASKS' | 'GROUP_SIMILAR' | 'ADD_BREAK' | 'DEFER_TASK' | 'CHANGE_MUST' | 'OPEN_MORNING_REVIEW' | 'SHOW_BURNOUT_MODAL' | 'REORDER_QUEUE'
  taskIds?: string[]
  taskId?: string
  priority?: 'high' | 'group'
  durationMinutes?: number
  pin?: boolean
  metadata?: Record<string, any>
  newQueue?: any[]
}

// Recommendation (actionable suggestion)
export interface Recommendation {
  id: string
  type: string  // 'GROUP_SIMILAR', 'DEFER_TASK', 'ADD_BREAK', 'ENERGY_MISMATCH', etc.
  title: string
  reason: string
  actions: RecommendationAction[]
  confidence?: number
  created_at?: string
}
