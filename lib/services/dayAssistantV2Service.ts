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
    .from('test_day_assistant_tasks')
    .select(options?.includeSubtasks 
      ? `*,test_day_subtasks(*)` 
      : '*'
    )
    .eq('user_id', userId)
    .eq('assistant_id', assistantId)
    .order('position', { ascending: true })
  
  if (!options?.includeCompleted) {
    query = query.eq('completed', false)
  }
  
  // Only filter by date if not includeAllDates
  if (options?.includeAllDates) {
    console.log('[getTasks] includeAllDates=true, skipping date filter')
  } else if (options?.date) {
    console.log('[getTasks] Filtering by due_date:', options.date)
    query = query.eq('due_date', options.date)
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
    console.error('[getTasks] Error fetching tasks:', error)
    return []
  }
  
  // Log results
  console.log('[getTasks] Query returned', data?.length || 0, 'tasks')
  
  // Transform the data to match TestDayTask interface
  if (!data) return []
  if (!Array.isArray(data)) {
    console.error('[getTasks] Unexpected data format:', data)
    return []
  }
  const typedData = data as unknown as TestDayTask[]
  
  // Log sample tasks (first 3)
  if (typedData.length > 0) {
    const sampleTasks = typedData.slice(0, 3).map(task => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      completed: task.completed,
      priority: task.priority
    }))
    console.log('[getTasks] Sample tasks (first 3):', sampleTasks)
  }
  
  // Diagnostic: If query with date returns 0 tasks, show all tasks
  if (data.length === 0 && options?.date && !options?.includeAllDates) {
    console.log('[getTasks] No tasks found for date', options.date, '- fetching all tasks for diagnostic')
    const { data: allTasks, error: allError } = await db
      .from('test_day_assistant_tasks')
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
  const tasks = typedData.map((task) => {
    const taskData = task as Record<string, any>
    return {
      ...taskData,
      subtasks: options?.includeSubtasks ? taskData.test_day_subtasks || [] : undefined
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
    .from('test_day_assistant_tasks')
    .insert({
      user_id: userId,
      assistant_id: assistantId,
      title: task.title,
      description: task.description,
      priority: task.priority || 3,
      is_must: task.is_must || false,
      is_important: task.is_important || false,
      estimate_min: task.estimate_min || 30,
      cognitive_load: task.cognitive_load || 3,
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
    .from('test_day_assistant_tasks')
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
    .from('test_day_plan')
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
    .from('test_day_plan')
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
    .from('test_day_plan')
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
    .from('test_day_assistant_tasks')
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
    .from('test_day_assistant_tasks')
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
    .from('test_day_undo_history')
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
    .from('test_day_decision_log')
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
    .from('test_day_undo_history')
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
    .from('test_day_assistant_tasks')
    .update(previousState)
    .eq('id', previousState.id)
  
  if (restoreError) {
    console.error('Error restoring task state:', restoreError)
    return { success: false, message: 'Błąd podczas cofania akcji' }
  }
  
  // Mark as undone
  await db
    .from('test_day_undo_history')
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
    .from('test_day_proposals')
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
    .from('test_day_proposals')
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
    .from('test_day_proposals')
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
    .from('test_day_assistant_tasks')
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
    .from('test_day_assistant_tasks')
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
      .from('test_day_assistant_tasks')
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
