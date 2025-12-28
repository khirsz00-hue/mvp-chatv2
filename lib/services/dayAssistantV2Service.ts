/**
 * Day Assistant v2 Service
 * Core business logic for the enhanced day planner
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'
import {
  AssistantConfig,
  TestDayTask,
  DayPlan,
  Proposal,
  DecisionLogEntry,
  UndoHistoryEntry,
  TestDaySubtask,
  DEFAULT_SETTINGS,
  AssistantSettings,
  DecisionContext,
  ProposalAction
} from '@/lib/types/dayAssistantV2'

// Type for Todoist API update payload
export interface TodoistUpdatePayload {
  due_date?: string | null
  content?: string
  description?: string
  labels?: string[]
  project_id?: string
  completed?: boolean
}

const isNullableString = (value: unknown) =>
  value === null || typeof value === 'string' || value === undefined

const isNonArrayObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Helper to safely extract task preview for logging
const getTaskPreview = (task: unknown): { id?: unknown; title?: unknown; due_date?: unknown } => {
  if (task && typeof task === 'object' && isNonArrayObject(task)) {
    return {
      id: 'id' in task ? task.id : undefined,
      title: 'title' in task ? task.title : undefined,
      due_date: 'due_date' in task ? task.due_date : undefined
    }
  }
  return {}
}

function isValidTestDayTask(task: unknown): task is TestDayTask {
  if (!isNonArrayObject(task)) return false
  const candidate = task
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.user_id === 'string' &&
    typeof candidate.assistant_id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.priority === 'number' &&
    typeof candidate.is_must === 'boolean' &&
    typeof candidate.is_important === 'boolean' &&
    typeof candidate.estimate_min === 'number' &&
    typeof candidate.cognitive_load === 'number' &&
    Array.isArray(candidate.tags) &&
    typeof candidate.position === 'number' &&
    typeof candidate.postpone_count === 'number' &&
    typeof candidate.auto_moved === 'boolean' &&
    isNonArrayObject(candidate.metadata) &&
    typeof candidate.created_at === 'string' &&
    typeof candidate.updated_at === 'string' &&
    typeof candidate.completed === 'boolean' &&
    isNullableString(candidate.todoist_id) &&
    isNullableString(candidate.description) &&
    isNullableString(candidate.todoist_task_id) &&
    isNullableString(candidate.completed_at) &&
    isNullableString(candidate.context_type) &&
    isNullableString(candidate.moved_from_date) &&
    isNullableString(candidate.moved_reason) &&
    isNullableString(candidate.last_moved_at) &&
    isNullableString(candidate.due_date)
  )
}

// Timeout constants
const TODOIST_API_TIMEOUT_MS = 10000 // 10 seconds
const DEFAULT_RETRY_ATTEMPTS = 3
const MAX_RETRY_DELAY_MS = 5000 // 5 seconds

/**
 * Sync task changes back to Todoist (bidirectional sync)
 * With retry logic and exponential backoff
 * 
 * @param userId - User ID for fetching Todoist token
 * @param todoistId - Todoist task ID to update
 * @param updates - Task updates to apply
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise<boolean> - True if sync succeeded, false otherwise
 * 
 * Retry behavior:
 * - Attempts the sync operation up to `retries` times
 * - Uses exponential backoff between retries (1s, 2s, 4s, max 5s)
 * - Returns false if all retries fail
 * - Treats 404 errors as success (task already deleted in Todoist)
 */
export async function syncTaskChangeToTodoist(
  userId: string,
  todoistId: string,
  updates: {
    due_date?: string | null
    content?: string
    description?: string
    labels?: string[]
    project_id?: string
    completed?: boolean
  },
  retries: number = DEFAULT_RETRY_ATTEMPTS
): Promise<boolean> {
  let lastError: Error | null = null
  
  // Fetch Todoist token once before retry loop to avoid repeated DB calls
  const { data: profile, error: profileError } = await supabaseServer
    .from('user_profiles')
    .select('todoist_token')
    .eq('id', userId)
    .single()
  
  if (profileError) {
    console.error(`❌ [syncTaskChangeToTodoist] Error fetching profile:`, profileError)
    return false
  }
  
  if (!profile?.todoist_token) {
    console.warn('⚠️ [syncTaskChangeToTodoist] No Todoist token found - skipping sync')
    return false
  }
  
  const todoistToken = profile.todoist_token
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 [syncTaskChangeToTodoist] Attempt ${attempt}/${retries} for task ${todoistId}`)

      // If completing task, use complete endpoint
      if (updates.completed) {
        console.log(`🔍 [syncTaskChangeToTodoist] Completing task in Todoist: ${todoistId}`)
        
        const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${todoistId}/close`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${todoistToken}`
          },
          signal: AbortSignal.timeout(TODOIST_API_TIMEOUT_MS)
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ [syncTaskChangeToTodoist] Failed to complete task (status ${response.status}):`, errorText)
          
          // If 404, task doesn't exist in Todoist - consider it success (already deleted)
          if (response.status === 404) {
            console.warn('⚠️ [syncTaskChangeToTodoist] Task not found in Todoist (404) - considering as success')
            return true
          }
          
          throw new Error(`Todoist API error: ${response.status} - ${errorText}`)
        }
        
        console.log(`✅ [syncTaskChangeToTodoist] Completed task in Todoist: ${todoistId}`)
        return true
      }

      // Otherwise, update task
      const todoistPayload: TodoistUpdatePayload = {}
      
      if (updates.due_date !== undefined) {
        todoistPayload.due_date = updates.due_date
      }
      if (updates.content !== undefined) {
        todoistPayload.content = updates.content
      }
      if (updates.description !== undefined) {
        todoistPayload.description = updates.description
      }
      if (updates.labels) {
        todoistPayload.labels = updates.labels
      }
      if (updates.project_id) {
        todoistPayload.project_id = updates.project_id
      }

      console.log(`🔍 [syncTaskChangeToTodoist] Updating task in Todoist: ${todoistId}`)
      
      // Todoist REST API v2 uses POST for task updates (not PUT/PATCH)
      // See: https://developer.todoist.com/rest/v2/#update-a-task
      const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${todoistId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${todoistToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(todoistPayload),
        signal: AbortSignal.timeout(TODOIST_API_TIMEOUT_MS)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ [syncTaskChangeToTodoist] Failed to update Todoist (status ${response.status}):`, errorText)
        
        // If 404, task doesn't exist in Todoist - consider it success (already deleted)
        if (response.status === 404) {
          console.warn('⚠️ [syncTaskChangeToTodoist] Task not found in Todoist (404) - considering as success')
          return true
        }
        
        throw new Error(`Todoist API error: ${response.status} - ${errorText}`)
      }
      
      console.log(`✅ [syncTaskChangeToTodoist] Synced to Todoist: ${todoistId}`)
      return true
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`❌ [syncTaskChangeToTodoist] Attempt ${attempt}/${retries} failed:`, lastError.message)
      
      // If this is not the last attempt, wait with exponential backoff
      if (attempt < retries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS)
        console.log(`⏳ [syncTaskChangeToTodoist] Waiting ${delayMs}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  
  // All retries failed
  console.error(`❌ [syncTaskChangeToTodoist] All ${retries} attempts failed. Last error:`, lastError?.message)
  return false
}

/**
 * Create or get the day assistant v2 for a user
 */
export async function getOrCreateDayAssistantV2(
  userId: string,
  client?: SupabaseClient
): Promise<AssistantConfig | null> {
  const db = client || supabaseServer
  
  // Try to find existing assistant
  const { data: existing, error: fetchError } = await db
    .from('assistant_config')
    .select('*')
    .eq('user_id', userId)
    .eq('name', 'asystent dnia v2')
    .single()
  
  if (existing && !fetchError) {
    return existing as AssistantConfig
  }
  
  // Create new assistant with default settings
  const { data: newAssistant, error: createError } = await db
    .from('assistant_config')
    .insert({
      user_id: userId,
      name: 'asystent dnia v2',
      type: 'day_planner',
      settings: DEFAULT_SETTINGS,
      is_active: true
    })
    .select()
    .single()
  
  if (createError) {
    console.error('Error creating test day assistant:', createError)
    return null
  }
  
  return newAssistant as AssistantConfig
}

/**
 * Get assistant by ID
 */
export async function getAssistant(
  assistantId: string,
  client?: SupabaseClient
): Promise<AssistantConfig | null> {
  const db = client || supabaseServer
  const { data, error } = await db
    .from('assistant_config')
    .select('*')
    .eq('id', assistantId)
    .single()
  
  if (error) {
    console.error('Error fetching assistant:', error)
    return null
  }
  
  return data as AssistantConfig
}

/**
 * Update assistant settings
 */
export async function updateAssistantSettings(
  assistantId: string,
  settings: Partial<AssistantSettings>,
  client?: SupabaseClient
): Promise<AssistantConfig | null> {
  const db = client || supabaseServer
  
  // Get current settings
  const assistant = await getAssistant(assistantId, client)
  if (!assistant) return null
  
  // Merge settings
  const newSettings = { ...assistant.settings, ...settings }
  
  const { data, error } = await db
    .from('assistant_config')
    .update({ settings: newSettings })
    .eq('id', assistantId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating assistant settings:', error)
    return null
  }
  
  return data as AssistantConfig
}

/**
 * Get all tasks for an assistant
 */
export async function getTasks(
  userId: string,
  assistantId: string,
  options?: {
    includeCompleted?: boolean
    date?: string
    includeSubtasks?: boolean
    includeAllDates?: boolean
  },
  client?: SupabaseClient
): Promise<TestDayTask[]> {
  const db = client || supabaseServer
  
  // Debug logging - TODO: Consider removing or gating behind env variable in production
  // Log function call with parameters
  console.log('[getTasks] Called with:', {
    userId,
    assistantId,
    options: {
      includeCompleted: options?.includeCompleted,
      date: options?.date,
      includeSubtasks: options?.includeSubtasks,
      includeAllDates: options?.includeAllDates
    }
  })
  
  let query = db
    .from('day_assistant_v2_tasks')
    .select(options?.includeSubtasks 
      ? `*, day_assistant_v2_subtasks(*)` 
      : '*'
    )
    .eq('user_id', userId)
    .eq('assistant_id', assistantId)
    .order('position', { ascending: true })
  
  if (!options?.includeCompleted) {
    query = query.eq('completed', false)
  }
  
  // Only filter by date if not includeAllDates
  let targetDate: string | null = null
  if (options?.includeAllDates) {
    console.log('[getTasks] includeAllDates=true, skipping date filter')
  } else if (options?.date) {
    console.log('[getTasks] Filtering by due_date:', options.date)
    const safeDate = options.date.trim()
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(safeDate)
    const parsed = Date.parse(safeDate)
    const matchesCalendarDate = !Number.isNaN(parsed) && new Date(parsed).toISOString().split('T')[0] === safeDate
    if (!isValidDate || !matchesCalendarDate) {
      console.warn('[getTasks] Invalid date format provided, returning empty result')
      return []
    }
    targetDate = safeDate
  }
  
  // Log query details
  console.log('[getTasks] Query filters:', {
    user_id: userId,
    assistant_id: assistantId,
    completed: options?.includeCompleted ? 'any' : false,
    due_date: options?.includeAllDates ? 'all dates' : options?.date || 'any',
    include_subtasks: options?.includeSubtasks || false
  })
  
  const { data, error } = await query
  
  if (error) {
    console.error('[getTasks] ❌ Error fetching tasks:', error)
    return []
  }
  
  // Transform the data to match TestDayTask interface
  if (!data) return []
  if (!Array.isArray(data)) {
    console.error('[getTasks] Unexpected data format:', data)
    return []
  }
  
  // Log results with more details
  console.log('[getTasks] ✅ Query returned', data.length, 'tasks')
  
  if (data.length === 0) {
    console.warn('[getTasks] ⚠️  WARNING: Query returned 0 tasks')
    console.warn('[getTasks] Query parameters:', {
      userId,
      assistantId,
      date: options?.date || 'any',
      includeCompleted: options?.includeCompleted || false,
      includeAllDates: options?.includeAllDates || false
    })
  }
  
  const typedData = (data as unknown[]).filter((task) => {
    const valid = isValidTestDayTask(task)
    if (!valid) {
      // Log detailed validation failure reason
      const reasons: string[] = []
      if (!isNonArrayObject(task)) {
        reasons.push('not an object')
        console.warn('[getTasks] ❌ Skipping invalid task - not an object:', task)
      } else {
        const t = task
        if (typeof t.id !== 'string') reasons.push(`id: ${typeof t.id}`)
        if (typeof t.user_id !== 'string') reasons.push(`user_id: ${typeof t.user_id}`)
        if (typeof t.assistant_id !== 'string') reasons.push(`assistant_id: ${typeof t.assistant_id}`)
        if (typeof t.title !== 'string') reasons.push(`title: ${typeof t.title}`)
        if (typeof t.priority !== 'number') reasons.push(`priority: ${typeof t.priority}`)
        if (typeof t.is_must !== 'boolean') reasons.push(`is_must: ${typeof t.is_must}`)
        if (typeof t.is_important !== 'boolean') reasons.push(`is_important: ${typeof t.is_important}`)
        if (typeof t.estimate_min !== 'number') reasons.push(`estimate_min: ${typeof t.estimate_min}`)
        if (typeof t.cognitive_load !== 'number') reasons.push(`cognitive_load: ${typeof t.cognitive_load}`)
        if (!Array.isArray(t.tags)) reasons.push(`tags: not array`)
        if (typeof t.position !== 'number') reasons.push(`position: ${typeof t.position}`)
        if (typeof t.postpone_count !== 'number') reasons.push(`postpone_count: ${typeof t.postpone_count}`)
        if (typeof t.auto_moved !== 'boolean') reasons.push(`auto_moved: ${typeof t.auto_moved}`)
        if (!isNonArrayObject(t.metadata)) reasons.push(`metadata: not object`)
        if (typeof t.created_at !== 'string') reasons.push(`created_at: ${typeof t.created_at}`)
        if (typeof t.updated_at !== 'string') reasons.push(`updated_at: ${typeof t.updated_at}`)
        if (typeof t.completed !== 'boolean') reasons.push(`completed: ${typeof t.completed}`)
        
        console.warn('[getTasks] ❌ Skipping invalid task payload. Validation failures:', reasons.join(', '))
        console.warn('[getTasks] Task preview:', getTaskPreview(task))
      }
    }
    return valid
  })
  // Filter by date: Include tasks with matching due_date, null due_date (inbox tasks), AND overdue tasks
  // When a specific date is requested, we want to show:
  // 1. Tasks specifically scheduled for that date (due_date === targetDate)
  // 2. Tasks without a due date (due_date === null) to surface inbox items
  // 3. Overdue tasks (due_date < targetDate) - CRITICAL for showing past-due tasks
  const filteredByDate = targetDate
    ? typedData.filter(task => {
        if (task.due_date === null || task.due_date === undefined) return true // Include inbox tasks
        if (task.due_date === targetDate) return true // Include today's tasks
        if (task.due_date < targetDate) return true // Include OVERDUE tasks (CRITICAL FIX)
        return false // Exclude future tasks
      })
    : typedData
  
  // Log detailed breakdown of filtered tasks (gated for performance)
  if (targetDate && filteredByDate.length > 0 && process.env.NODE_ENV !== 'production') {
    const overdueTasks = filteredByDate.filter(task => task.due_date && task.due_date < targetDate)
    const todayTasks = filteredByDate.filter(task => task.due_date === targetDate)
    const inboxTasks = filteredByDate.filter(task => task.due_date === null || task.due_date === undefined)
    
    console.log('📊 [getTasks] Filtered tasks breakdown:', {
      total: filteredByDate.length,
      overdue: overdueTasks.length,
      today: todayTasks.length,
      inbox: inboxTasks.length,
      targetDate
    })
    
    if (overdueTasks.length > 0) {
      const targetDateTime = new Date(targetDate).getTime()
      const msPerDay = 1000 * 60 * 60 * 24
      console.log('⚠️ [getTasks] Overdue tasks found:', overdueTasks.map(t => ({
        title: t.title,
        due_date: t.due_date,
        days_overdue: t.due_date ? Math.floor((targetDateTime - new Date(t.due_date).getTime()) / msPerDay) : 0
      })))
    }
  }
  
  // Log sample tasks (first 3)
  if (filteredByDate.length > 0) {
    const sampleTasks = filteredByDate.slice(0, 3).map(task => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      completed: task.completed,
      priority: task.priority
    }))
    console.log('[getTasks] Sample tasks (first 3):', sampleTasks)
  }
  
  // Diagnostic: If query with date returns 0 tasks, show all tasks
  if (filteredByDate.length === 0 && options?.date && !options?.includeAllDates) {
    console.log('[getTasks] No tasks found for date', options.date, '- fetching all tasks for diagnostic')
    const { data: allTasks, error: allError } = await db
      .from('day_assistant_v2_tasks')
      .select('id, title, due_date, completed')
      .eq('user_id', userId)
      .eq('assistant_id', assistantId)
      .limit(10)
    
    if (allError) {
      console.error('[getTasks] Error fetching all tasks:', allError)
    } else if (allTasks) {
      console.log('[getTasks] Total tasks in DB (first 10):', allTasks.length)
      if (allTasks.length > 0) {
        console.log('[getTasks] All tasks sample:', allTasks)
      } else {
        console.log('[getTasks] No tasks found in DB for this user/assistant combination')
      }
    }
  }
  
  // Map database records to TestDayTask with proper typing
  const tasks = filteredByDate.map((task) => {
    const taskWithRelations = task as TestDayTask & { day_assistant_v2_subtasks?: TestDaySubtask[] }
    let subtasks: TestDaySubtask[] | undefined
    if (options?.includeSubtasks) {
      subtasks = Array.isArray(taskWithRelations.day_assistant_v2_subtasks) ? taskWithRelations.day_assistant_v2_subtasks : []
    }
    return {
      ...taskWithRelations,
      subtasks
    }
  }) as TestDayTask[]
  
  return tasks
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  assistantId: string,
  task: Partial<TestDayTask>,
  client?: SupabaseClient
): Promise<TestDayTask | null> {
  const db = client || supabaseServer
  
  const { data, error } = await db
    .from('day_assistant_v2_tasks')
    .insert({
      user_id: userId,
      assistant_id: assistantId,
      title: task.title,
      description: task.description,
      todoist_task_id: task.todoist_task_id,
      todoist_id: task.todoist_id,
      priority: task.priority || 3,
      is_must: task.is_must || false,
      is_important: task.is_important || false,
      estimate_min: task.estimate_min || 30,
      cognitive_load: task.cognitive_load ?? 2,
      tags: task.tags || [],
      context_type: task.context_type,
      due_date: task.due_date,
      position: task.position || 0,
      metadata: task.metadata || {}
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating task:', error)
    return null
  }
  
  return data as TestDayTask
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<TestDayTask>,
  client?: SupabaseClient
): Promise<TestDayTask | null> {
  const db = client || supabaseServer
  
  const { data, error } = await db
    .from('day_assistant_v2_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating task:', error)
    return null
  }
  
  return data as TestDayTask
}

/**
 * Get or create day plan for a specific date
 */
export async function getOrCreateDayPlan(
  userId: string,
  assistantId: string,
  date: string,
  client?: SupabaseClient
): Promise<DayPlan | null> {
  const db = client || supabaseServer
  
  // Try to find existing plan
  const { data: existing, error: fetchError } = await db
    .from('day_assistant_v2_plan')
    .select('*')
    .eq('user_id', userId)
    .eq('assistant_id', assistantId)
    .eq('plan_date', date)
    .single()
  
  if (existing && !fetchError) {
    return existing as DayPlan
  }
  
  // Create new plan with default values
  const { data: newPlan, error: createError } = await db
    .from('day_assistant_v2_plan')
    .insert({
      user_id: userId,
      assistant_id: assistantId,
      plan_date: date,
      energy: 3,
      focus: 3,
      blocks: [],
      metadata: {}
    })
    .select()
    .single()
  
  if (createError) {
    console.error('Error creating day plan:', createError)
    return null
  }
  
  return newPlan as DayPlan
}

/**
 * Update day plan (energy/focus sliders or blocks)
 */
export async function updateDayPlan(
  userId: string,
  assistantId: string,
  date: string,
  updates: Partial<DayPlan>,
  client?: SupabaseClient
): Promise<DayPlan | null> {
  const db = client || supabaseServer
  
  const { data, error } = await db
    .from('day_assistant_v2_plan')
    .update(updates)
    .eq('user_id', userId)
    .eq('assistant_id', assistantId)
    .eq('plan_date', date)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating day plan:', error)
    return null
  }
  
  return data as DayPlan
}

/**
 * Postpone task ("Nie dziś" button)
 */
export async function postponeTask(
  userId: string,
  assistantId: string,
  taskId: string,
  reason?: string,
  reserveMorning?: boolean,
  client?: SupabaseClient
): Promise<{
  success: boolean
  task?: TestDayTask
  decision_log_id?: string
  undo_window_expires?: string
}> {
  const db = client || supabaseServer
  
  // Get current task
  const { data: task, error: taskError } = await db
    .from('day_assistant_v2_tasks')
    .select('*')
    .eq('id', taskId)
    .single()
  
  if (taskError || !task) {
    return { success: false }
  }
  
  // Calculate tomorrow's date
  const today = new Date(task.due_date || new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  // Update task with postpone tracking
  const { data: updatedTask, error: updateError } = await db
    .from('day_assistant_v2_tasks')
    .update({
      due_date: tomorrowStr,
      postpone_count: (task.postpone_count || 0) + 1,
      moved_from_date: task.due_date,
      moved_reason: reason || 'User clicked "Nie dziś"',
      last_moved_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single()
  
  if (updateError) {
    console.error('Error postponing task:', updateError)
    return { success: false }
  }
  
  // Sync back to Todoist
  if (updatedTask.todoist_id) {
    await syncTaskChangeToTodoist(userId, updatedTask.todoist_id, {
      due_date: tomorrowStr
    })
  }
  
  // Get assistant for settings
  const assistant = await getAssistant(assistantId, client)
  const undoWindow = assistant?.settings?.undo_window || DEFAULT_SETTINGS.undo_window!
  
  // Log decision
  const decisionLogEntry = await logDecision(
    userId,
    assistantId,
    'postpone',
    {
      task_id: taskId,
      from_date: task.due_date,
      to_date: tomorrowStr,
      reason: reason,
      context: {
        postpone_count: updatedTask.postpone_count,
        reserve_morning: reserveMorning
      }
    },
    client
  )
  
  if (!decisionLogEntry) {
    return { success: false }
  }
  
  // Create undo history entry
  const undoExpires = new Date()
  undoExpires.setSeconds(undoExpires.getSeconds() + undoWindow)
  
  await db
    .from('day_assistant_v2_undo_history')
    .insert({
      user_id: userId,
      assistant_id: assistantId,
      decision_log_id: decisionLogEntry.id,
      previous_state: task,
      undo_window_expires: undoExpires.toISOString()
    })
  
  return {
    success: true,
    task: updatedTask as TestDayTask,
    decision_log_id: decisionLogEntry.id,
    undo_window_expires: undoExpires.toISOString()
  }
}

/**
 * Log a decision
 */
export async function logDecision(
  userId: string,
  assistantId: string,
  action: string,
  data: {
    task_id?: string
    from_date?: string
    to_date?: string
    reason?: string
    context?: DecisionContext
  },
  client?: SupabaseClient
): Promise<DecisionLogEntry | null> {
  const db = client || supabaseServer
  
  const { data: entry, error } = await db
    .from('day_assistant_v2_decision_log')
    .insert({
      user_id: userId,
      assistant_id: assistantId,
      task_id: data.task_id,
      action: action,
      from_date: data.from_date,
      to_date: data.to_date,
      reason: data.reason,
      context: data.context || {}
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error logging decision:', error)
    return null
  }
  
  return entry as DecisionLogEntry
}

/**
 * Undo last action (within undo window)
 */
export async function undoLastAction(
  userId: string,
  assistantId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; message: string }> {
  const db = client || supabaseServer
  
  // Find most recent undo-able entry
  const { data: undoEntry, error: fetchError } = await db
    .from('day_assistant_v2_undo_history')
    .select('*')
    .eq('user_id', userId)
    .eq('assistant_id', assistantId)
    .eq('undone', false)
    .gte('undo_window_expires', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (fetchError || !undoEntry) {
    return { success: false, message: 'Brak akcji do cofnięcia (okno undo wygasło)' }
  }
  
  const previousState = undoEntry.previous_state as TestDayTask
  
  // Restore previous state
  const { error: restoreError } = await db
    .from('day_assistant_v2_tasks')
    .update(previousState)
    .eq('id', previousState.id)
  
  if (restoreError) {
    console.error('Error restoring task state:', restoreError)
    return { success: false, message: 'Błąd podczas cofania akcji' }
  }
  
  // Mark as undone
  await db
    .from('day_assistant_v2_undo_history')
    .update({
      undone: true,
      undone_at: new Date().toISOString()
    })
    .eq('id', undoEntry.id)
  
  // Log the undo action
  await logDecision(
    userId,
    assistantId,
    'undo',
    {
      task_id: previousState.id,
      reason: 'User undid last action',
      context: { undo_entry_id: undoEntry.id }
    },
    client
  )
  
  return { success: true, message: 'Cofnięto ostatnią akcję' }
}

/**
 * Create a proposal (recommendation)
 */
export async function createProposal(
  userId: string,
  assistantId: string,
  planDate: string,
  reason: string,
  primaryAction: ProposalAction,
  alternatives: ProposalAction[],
  client?: SupabaseClient
): Promise<Proposal | null> {
  const db = client || supabaseServer
  
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)  // Proposals expire after 24 hours
  
  const { data, error } = await db
    .from('day_assistant_v2_proposals')
    .insert({
      user_id: userId,
      assistant_id: assistantId,
      plan_date: planDate,
      reason: reason,
      primary_action: primaryAction,
      alternatives: alternatives,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating proposal:', error)
    return null
  }
  
  return data as Proposal
}

/**
 * Get active proposals for a date
 */
export async function getActiveProposals(
  userId: string,
  assistantId: string,
  date: string,
  client?: SupabaseClient
): Promise<Proposal[]> {
  const db = client || supabaseServer
  
  const { data, error } = await db
    .from('day_assistant_v2_proposals')
    .select('*')
    .eq('user_id', userId)
    .eq('assistant_id', assistantId)
    .eq('plan_date', date)
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching proposals:', error)
    return []
  }
  
  return data as Proposal[]
}

/**
 * Respond to a proposal
 */
export async function respondToProposal(
  proposalId: string,
  action: 'accept_primary' | 'accept_alt' | 'reject',
  alternativeIndex?: number,
  client?: SupabaseClient
): Promise<{ success: boolean; message: string }> {
  const db = client || supabaseServer
  
  const status = action === 'reject' ? 'rejected' : 'accepted'
  
  const { error } = await db
    .from('day_assistant_v2_proposals')
    .update({
      status: status,
      responded_at: new Date().toISOString()
    })
    .eq('id', proposalId)
  
  if (error) {
    console.error('Error responding to proposal:', error)
    return { success: false, message: 'Błąd podczas odpowiedzi na propozycję' }
  }
  
  return { success: true, message: 'Propozycja zaktualizowana' }
}

/**
 * Get MUST tasks count for a date
 */
export async function getMustTasksCount(
  userId: string,
  assistantId: string,
  date: string,
  client?: SupabaseClient
): Promise<number> {
  const db = client || supabaseServer
  
  const { count, error } = await db
    .from('day_assistant_v2_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('assistant_id', assistantId)
    .eq('due_date', date)
    .eq('is_must', true)
    .eq('completed', false)
  
  if (error) {
    console.error('Error counting MUST tasks:', error)
    return 0
  }
  
  return count || 0
}

/**
 * Auto-decompose task if it exceeds threshold
 */
export async function checkAndDecomposeTask(
  task: TestDayTask,
  assistant: AssistantConfig,
  client?: SupabaseClient
): Promise<{ shouldDecompose: boolean; reason?: string }> {
  const threshold = assistant.settings?.auto_decompose_threshold || DEFAULT_SETTINGS.auto_decompose_threshold!
  
  if (task.estimate_min > threshold) {
    return {
      shouldDecompose: true,
      reason: `Zadanie ma estymat ${task.estimate_min} min, co przekracza próg ${threshold} min. Zalecam podział na kroki po 25-30 min.`
    }
  }
  
  return { shouldDecompose: false }
}

/**
 * Nightly rollover - move overdue tasks to next day
 */
export async function nightlyRollover(
  userId: string,
  assistantId: string,
  client?: SupabaseClient
): Promise<{ moved: number; tasks: TestDayTask[] }> {
  const db = client || supabaseServer
  
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  
  // Find incomplete tasks from yesterday
  const { data: overdueTasks, error: fetchError } = await db
    .from('day_assistant_v2_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('assistant_id', assistantId)
    .eq('due_date', yesterdayStr)
    .eq('completed', false)
  
  if (fetchError || !overdueTasks || overdueTasks.length === 0) {
    return { moved: 0, tasks: [] }
  }
  
  // Move each task to today
  const movedTasks: TestDayTask[] = []
  for (const task of overdueTasks) {
    const { data: movedTask } = await db
      .from('day_assistant_v2_tasks')
      .update({
        due_date: today,
        auto_moved: true,
        moved_from_date: yesterdayStr,
        moved_reason: 'Nightly rollover - incomplete task',
        last_moved_at: new Date().toISOString()
      })
      .eq('id', task.id)
      .select()
      .single()
    
    if (movedTask) {
      movedTasks.push(movedTask as TestDayTask)
    }
  }
  
  return { moved: movedTasks.length, tasks: movedTasks }
}
