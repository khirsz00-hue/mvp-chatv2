/**
 * Day Assistant MVP - Type Definitions
 * 
 * Types for NOW/NEXT/LATER interface, energy modes, task actions, and subtask generation
 */

// Energy mode types (🔴🟡🟢)
export type EnergyMode = 'crisis' | 'normal' | 'flow'

// Task priority in day queue
export type DayPriority = 'now' | 'next' | 'later'

// Task action types
export type TaskActionType = 
  | 'pin_today'        // 📌 MUST TODAY
  | 'not_today'        // 🧊 NOT TODAY
  | 'mega_important'   // 🔥 MEGA IMPORTANT
  | 'move_to_now'
  | 'move_to_next'
  | 'move_to_later'

// Subtask feedback types
export type SubtaskFeedbackType = 
  | 'ok'
  | 'too_small'
  | 'too_big'
  | 'nonsense'
  | 'simplify'
  | 'split_more'

// Detail level for subtask generation
export type DetailLevel = 'minimum' | 'standard' | 'detailed'

// Feedback stage
export type FeedbackStage = 'pre_completion' | 'post_completion'

// Day Assistant Task
export interface DayTask {
  id: string
  user_id: string
  todoist_task_id?: string | null
  title: string
  description?: string | null
  priority: DayPriority
  is_pinned: boolean
  is_mega_important: boolean
  energy_mode_required: EnergyMode
  estimated_duration: number  // in minutes
  due_date?: string | null
  completed: boolean
  completed_at?: string | null
  position: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  subtasks?: DaySubtask[]  // populated when fetching with subtasks
}

// Subtask
export interface DaySubtask {
  id: string
  task_id: string
  content: string
  estimated_duration: number  // in minutes
  completed: boolean
  completed_at?: string | null
  position: number
  created_at: string
}

// User Energy State
export interface UserEnergyState {
  user_id: string
  current_mode: EnergyMode
  last_changed: string
  created_at: string
}

// Subtask Feedback
export interface SubtaskFeedback {
  id: string
  user_id: string
  subtask_id?: string | null
  task_id: string
  feedback_type: SubtaskFeedbackType
  feedback_stage: FeedbackStage
  detail_level: DetailLevel
  created_at: string
}

// Task Action History
export interface TaskActionHistory {
  id: string
  user_id: string
  task_id: string
  action_type: TaskActionType
  previous_state: Record<string, any>
  new_state: Record<string, any>
  metadata: Record<string, any>
  created_at: string
}

// User Day Preferences
export interface UserDayPreferences {
  user_id: string
  default_detail_level: DetailLevel
  preferred_step_duration: number  // in minutes
  preferences: Record<string, any>  // learned preferences
  created_at: string
  updated_at: string
}

// Flow Block (for Phase 10)
export interface FlowBlock {
  id: string
  user_id: string
  title: string
  context_type?: string | null
  estimated_duration: number  // in minutes
  started_at?: string | null
  completed_at?: string | null
  interrupted: boolean
  metadata: Record<string, any>
  created_at: string
}

// Flow Block Task
export interface FlowBlockTask {
  id: string
  block_id: string
  task_id: string
  position: number
  completed: boolean
  skipped: boolean
  created_at: string
}

// Queue State (NOW/NEXT/LATER)
export interface QueueState {
  now: DayTask | null         // 1 active task
  next: DayTask[]             // 2-5 tasks
  later: DayTask[]            // rest of tasks
  laterCount: number          // count for display
}

// Energy Mode Constraints
export interface EnergyModeConstraints {
  mode: EnergyMode
  maxStepDuration: number      // in minutes
  maxNextTasks: number         // max tasks in NEXT queue
  description: string
}

// Chat Command Intent
export interface ChatCommandIntent {
  command: string
  intent: 'pin_today' | 'not_today' | 'mega_important' | 'energy_change' | 'flow_block' | 'meeting_slot' | 'unknown'
  params?: Record<string, any>
}

// Agent Response
export interface AgentResponse {
  message: string
  actions?: AgentAction[]
  queueUpdate?: Partial<QueueState>
}

// Agent Action (buttons/commands)
export interface AgentAction {
  label: string
  type: 'button' | 'command'
  action: string
  params?: Record<string, any>
}

// Subtask Generation Request
export interface SubtaskGenerationRequest {
  task_id: string
  task_title: string
  task_description?: string
  detail_level: DetailLevel
  energy_mode: EnergyMode
  user_preferences?: Partial<UserDayPreferences>
}

// Subtask Generation Response
export interface SubtaskGenerationResponse {
  subtasks: Array<{
    content: string
    estimated_duration: number
  }>
  total_estimated_duration: number
}

// Meeting Slot Request
export interface MeetingSlotRequest {
  duration: number  // in minutes
  deadline?: string  // ISO date string
  preferences?: {
    preferred_hours?: [number, number]  // e.g., [9, 17] for 9am-5pm
    avoid_flow_blocks?: boolean
  }
}

// Meeting Slot
export interface MeetingSlot {
  date: string       // ISO date string
  start_time: string // HH:mm format
  end_time: string   // HH:mm format
  score?: number     // optional quality score
}

// Energy Mode Constants
export const ENERGY_MODE_CONSTRAINTS: Record<EnergyMode, EnergyModeConstraints> = {
  crisis: {
    mode: 'crisis',
    maxStepDuration: 5,
    maxNextTasks: 2,
    description: 'Kroki ≤5 min, NEXT max 2 pozycje'
  },
  normal: {
    mode: 'normal',
    maxStepDuration: 20,
    maxNextTasks: 5,
    description: 'Kroki 5-20 min, NEXT 2-5 pozycji'
  },
  flow: {
    mode: 'flow',
    maxStepDuration: 25,
    maxNextTasks: 5,
    description: 'Kroki do 25 min, możliwe bloki podobnych zadań'
  }
}

// Detail Level Descriptions
export const DETAIL_LEVEL_DESCRIPTIONS: Record<DetailLevel, string> = {
  minimum: 'Minimum (1 krok)',
  standard: 'Standard (1-2 kroki)',
  detailed: 'Dokładniej (max 3 kroki)'
}

// Energy Mode Emoji Map
export const ENERGY_MODE_EMOJI: Record<EnergyMode, string> = {
  crisis: '🔴',
  normal: '🟡',
  flow: '🟢'
}

// Task Action Emoji Map
export const TASK_ACTION_EMOJI: Record<string, string> = {
  pin_today: '📌',
  not_today: '🧊',
  mega_important: '🔥'
}
