/**
 * Day Assistant v2 - Type Definitions
 * Enhanced day planner with dual sliders, ADHD-friendly features, and live replanning
 */

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

// Assistant Settings
export interface AssistantSettings {
  undo_window?: number  // seconds, default 15
  max_postpones_before_escalation?: number  // default 3
  max_daily_recommendations?: number  // default 5
  light_task_limit_minutes?: number  // default 30
  morning_must_block_default?: number  // minutes, default 30
  auto_decompose_threshold?: number  // minutes, default 60
}

// Day Assistant v2 Task
export interface TestDayTask {
  id: string
  user_id: string
  assistant_id: string
  todoist_id?: string | null
  todoist_task_id?: string | null
  title: string
  description?: string | null
  priority: number  // Todoist priority (1-4)
  is_must: boolean  // MUST task (max 1-3 per day)
  is_important: boolean
  estimate_min: number
  cognitive_load: number  // 1-5 (1=light, 5=heavy)
  tags: string[]
  context_type?: string | null  // 'code', 'admin', 'komunikacja', 'prywatne'
  due_date?: string | null
  completed: boolean
  completed_at?: string | null
  position: number
  // Postpone tracking
  postpone_count: number
  moved_from_date?: string | null
  moved_reason?: string | null
  last_moved_at?: string | null
  auto_moved: boolean
  // Metadata
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  subtasks?: TestDaySubtask[]
}

// Day Plan (with dual sliders)
export interface DayPlan {
  id: string
  user_id: string
  assistant_id: string
  plan_date: string  // ISO date string
  energy: number  // 1-5
  focus: number  // 1-5
  blocks: TimeBlock[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Time Block
export interface TimeBlock {
  type: 'MUST' | 'matched' | 'break' | 'private'
  task_id?: string
  title: string
  start: string  // HH:mm format
  end: string    // HH:mm format
  locked: boolean
  estimate_min: number
}

// Proposal (recommendation with alternatives)
export interface Proposal {
  id: string
  user_id: string
  assistant_id: string
  plan_date: string
  reason: string  // AI explanation
  primary_action: ProposalAction
  alternatives: ProposalAction[]
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  created_at: string
  expires_at: string
  responded_at?: string | null
}

// Proposal Action
export interface ProposalAction {
  type: 'move_task' | 'decompose_task' | 'reserve_morning' | 'swap_tasks'
  task_id?: string
  from_date?: string
  to_date?: string
  params?: Record<string, any>
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

// Decision Context
export interface DecisionContext {
  energy?: number
  focus?: number
  time_of_day?: string
  tasks_completed_today?: number
  [key: string]: any
}

// Undo History Entry
export interface UndoHistoryEntry {
  id: string
  user_id: string
  assistant_id: string
  decision_log_id: string
  previous_state: any  // Full state snapshot
  undo_window_expires: string
  undone: boolean
  undone_at?: string | null
  created_at: string
}

// Subtask
export interface TestDaySubtask {
  id: string
  task_id: string
  content: string
  estimated_duration: number  // minutes
  completed: boolean
  completed_at?: string | null
  position: number
  created_at: string
}

// Scoring and Recommendation Types
export interface TaskScore {
  task_id: string
  score: number
  breakdown: ScoreBreakdown
}

export interface ScoreBreakdown {
  base_score: number  // priority + deadline + impact + dependencies
  fit_bonus: number   // energy/focus match
  avoidance_penalty: number  // postpone_count penalty
  final_score: number
}

// Recommendation Request
export interface RecommendationRequest {
  user_id: string
  assistant_id: string
  date: string
  trigger: 'task_added' | 'not_today_clicked' | 'slider_changed' | 'manual'
  context: {
    energy: number
    focus: number
    current_tasks: TestDayTask[]
    new_task_id?: string
  }
}

// Recommendation Response
export interface RecommendationResponse {
  recommendation: Proposal
  affected_tasks: string[]  // task IDs
}

// Energy/Focus Presets
export type EnergyFocusPreset = 'full_power' | 'light' | 'zero_focus' | 'rest'

export interface PresetConfig {
  name: string
  energy: number
  focus: number
  description: string
}

export const ENERGY_FOCUS_PRESETS: Record<EnergyFocusPreset, PresetConfig> = {
  full_power: {
    name: 'Pełna moc',
    energy: 5,
    focus: 5,
    description: 'Maksymalna energia i koncentracja'
  },
  light: {
    name: 'Lekko',
    energy: 3,
    focus: 3,
    description: 'Średnia energia, lekkie zadania'
  },
  zero_focus: {
    name: 'Zerowe skupienie',
    energy: 2,
    focus: 1,
    description: 'Tylko najprostsze zadania'
  },
  rest: {
    name: 'Odpoczynek',
    energy: 1,
    focus: 1,
    description: 'Czas na odpoczynek'
  }
}

// Soft Warning Types
export interface SoftWarning {
  type: 'unmark_must' | 'postpone_threshold' | 'decompose_suggested'
  title: string
  message: string
  task: TestDayTask
  options: SoftWarningOption[]
}

export interface SoftWarningOption {
  label: string
  action: 'confirm' | 'apply_recommendation' | 'cancel'
  actionData?: any
}

// API Request/Response Types
export interface PostponeTaskRequest {
  task_id: string
  reason?: string
  reserve_morning?: boolean
}

export interface PostponeTaskResponse {
  success: boolean
  decision_log_id: string
  undo_window_expires: string
  message: string
}

export interface UnmarkMustRequest {
  task_id: string
}

export interface UnmarkMustResponse {
  success: boolean
  proposal?: Proposal
  message: string
}

export interface ApplyProposalRequest {
  proposal_id: string
  action: 'accept_primary' | 'accept_alt' | 'reject'
  alternative_index?: number
}

export interface ApplyProposalResponse {
  success: boolean
  applied_actions: number
  message: string
}

// Timeline Types
export interface TimelineDay {
  date: string
  energy: number
  focus: number
  blocks: TimeBlock[]
  must_tasks: TestDayTask[]
  total_estimate: number
}

// Constants
export const DEFAULT_SETTINGS: AssistantSettings = {
  undo_window: 15,  // seconds
  max_postpones_before_escalation: 3,
  max_daily_recommendations: 5,
  light_task_limit_minutes: 30,
  morning_must_block_default: 30,  // minutes
  auto_decompose_threshold: 60  // minutes
}

export const COGNITIVE_LOAD_LABELS: Record<number, string> = {
  1: 'Bardzo lekkie',
  2: 'Lekkie',
  3: 'Średnie',
  4: 'Wymagające',
  5: 'Bardzo wymagające'
}

export const CONTEXT_TYPES = ['code', 'admin', 'komunikacja', 'prywatne'] as const
export type ContextType = typeof CONTEXT_TYPES[number]
