/**
 * Day Assistant Service
 * 
 * Handles CRUD operations for Day Assistant tasks, queue management, and user state
 */

import { supabase } from '@/lib/supabaseClient'
import {
  DayTask,
  DaySubtask,
  UserEnergyState,
  SubtaskFeedback,
  TaskActionHistory,
  UserDayPreferences,
  QueueState,
  EnergyMode,
  DayPriority,
  TaskActionType,
  ENERGY_MODE_CONSTRAINTS
} from '@/lib/types/dayAssistant'

/**
 * Get user's energy state
 */
export async function getUserEnergyState(userId: string): Promise<UserEnergyState | null> {
  const { data, error } = await supabase
    .from('user_energy_state')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found, create default state
      return await createDefaultEnergyState(userId)
    }
    console.error('Error fetching user energy state:', error)
    return null
  }

  return data as UserEnergyState
}

/**
 * Create default energy state for user
 */
async function createDefaultEnergyState(userId: string): Promise<UserEnergyState | null> {
  const { data, error } = await supabase
    .from('user_energy_state')
    .insert({
      user_id: userId,
      current_mode: 'normal'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating default energy state:', error)
    return null
  }

  return data as UserEnergyState
}

/**
 * Update user's energy mode
 */
export async function updateEnergyMode(userId: string, mode: EnergyMode): Promise<boolean> {
  const { error } = await supabase
    .from('user_energy_state')
    .upsert({
      user_id: userId,
      current_mode: mode,
      last_changed: new Date().toISOString()
    })

  if (error) {
    console.error('Error updating energy mode:', error)
    return false
  }

  return true
}

/**
 * Get all tasks for a user with their subtasks
 */
export async function getUserTasks(userId: string, includeCompleted = false): Promise<DayTask[]> {
  let query = supabase
    .from('day_assistant_tasks')
    .select(`
      *,
      day_assistant_subtasks (
        id,
        task_id,
        content,
        estimated_duration,
        completed,
        completed_at,
        position,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (!includeCompleted) {
    query = query.eq('completed', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching user tasks:', error)
    return []
  }

  // Transform the data to match DayTask interface
  const tasks = (data || []).map(task => ({
    ...task,
    subtasks: task.day_assistant_subtasks || []
  }))

  return tasks as DayTask[]
}

/**
 * Get queue state (NOW/NEXT/LATER) based on current energy mode
 */
export async function getQueueState(userId: string, includeLater = false): Promise<QueueState> {
  const energyState = await getUserEnergyState(userId)
  const tasks = await getUserTasks(userId)
  
  // Debug logging (remove in production or use proper logging framework)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[getQueueState] userId: ${userId}, tasks count: ${tasks.length}`)
  }
  
  const mode = energyState?.current_mode || 'normal'
  const constraints = ENERGY_MODE_CONSTRAINTS[mode]

  // Separate tasks by priority
  const nowTasks = tasks.filter(t => t.priority === 'now')
  const nextTasks = tasks.filter(t => t.priority === 'next')
  const laterTasks = tasks.filter(t => t.priority === 'later')

  if (process.env.NODE_ENV === 'development') {
    console.log(`[getQueueState] Priority distribution - NOW: ${nowTasks.length}, NEXT: ${nextTasks.length}, LATER: ${laterTasks.length}`)
  }

  // Take only the first task from NOW
  const now = nowTasks[0] || null

  // Limit NEXT based on energy mode
  const next = nextTasks.slice(0, constraints.maxNextTasks)

  // Rest goes to LATER
  const later = [
    ...nowTasks.slice(1),  // Additional NOW tasks
    ...nextTasks.slice(constraints.maxNextTasks),  // Overflow from NEXT
    ...laterTasks
  ]

  return {
    now,
    next,
    later: includeLater ? later : [],  // Only return if explicitly requested
    laterCount: later.length
  }
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  task: Partial<DayTask>
): Promise<DayTask | null> {
  const { data, error } = await supabase
    .from('day_assistant_tasks')
    .insert({
      user_id: userId,
      title: task.title,
      description: task.description,
      priority: task.priority || 'later',
      is_pinned: task.is_pinned || false,
      is_mega_important: task.is_mega_important || false,
      energy_mode_required: task.energy_mode_required || 'normal',
      estimated_duration: task.estimated_duration || 15,
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

  return data as DayTask
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<DayTask>
): Promise<DayTask | null> {
  const { data, error } = await supabase
    .from('day_assistant_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    return null
  }

  return data as DayTask
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('day_assistant_tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    console.error('Error deleting task:', error)
    return false
  }

  return true
}

/**
 * Move task to a different priority section
 */
export async function moveTask(
  taskId: string,
  newPriority: DayPriority,
  newPosition?: number
): Promise<DayTask | null> {
  const updates: Partial<DayTask> = { priority: newPriority }
  if (newPosition !== undefined) {
    updates.position = newPosition
  }

  return await updateTask(taskId, updates)
}

/**
 * Pin task for today (📌 MUST TODAY)
 */
export async function pinTaskToday(userId: string, taskId: string): Promise<DayTask | null> {
  // Get current task state for history
  const { data: currentTask } = await supabase
    .from('day_assistant_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!currentTask) return null

  // Update task
  const updatedTask = await updateTask(taskId, {
    is_pinned: true,
    priority: 'next'  // Move to NEXT, agent will organize
  })

  if (updatedTask) {
    // Record action in history
    await recordTaskAction(userId, taskId, 'pin_today', currentTask, updatedTask)
  }

  return updatedTask
}

/**
 * Postpone task to another day (🧊 NOT TODAY)
 */
export async function postponeTask(userId: string, taskId: string): Promise<DayTask | null> {
  const { data: currentTask } = await supabase
    .from('day_assistant_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!currentTask) return null

  const updatedTask = await updateTask(taskId, {
    priority: 'later',
    is_pinned: false
  })

  if (updatedTask) {
    await recordTaskAction(userId, taskId, 'not_today', currentTask, updatedTask)
  }

  return updatedTask
}

/**
 * Escalate task to highest priority (🔥 MEGA IMPORTANT)
 */
export async function escalateTask(userId: string, taskId: string): Promise<DayTask | null> {
  const { data: currentTask } = await supabase
    .from('day_assistant_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!currentTask) return null

  const updatedTask = await updateTask(taskId, {
    is_mega_important: true,
    priority: 'now'  // Move to NOW immediately
  })

  if (updatedTask) {
    await recordTaskAction(userId, taskId, 'mega_important', currentTask, updatedTask)
  }

  return updatedTask
}

/**
 * Record task action in history for undo functionality
 */
async function recordTaskAction(
  userId: string,
  taskId: string,
  actionType: TaskActionType,
  previousState: any,
  newState: any
): Promise<void> {
  await supabase
    .from('task_action_history')
    .insert({
      user_id: userId,
      task_id: taskId,
      action_type: actionType,
      previous_state: previousState,
      new_state: newState,
      metadata: {}
    })
}

/**
 * Get task action history (for undo)
 */
export async function getTaskHistory(userId: string, limit = 10): Promise<TaskActionHistory[]> {
  const { data, error } = await supabase
    .from('task_action_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching task history:', error)
    return []
  }

  return data as TaskActionHistory[]
}

/**
 * Undo last action
 */
export async function undoLastAction(userId: string): Promise<boolean> {
  const history = await getTaskHistory(userId, 1)
  if (history.length === 0) return false

  const lastAction = history[0]
  const previousState = lastAction.previous_state as Partial<DayTask>

  // Restore previous state
  const { error } = await supabase
    .from('day_assistant_tasks')
    .update(previousState)
    .eq('id', lastAction.task_id)

  if (error) {
    console.error('Error undoing action:', error)
    return false
  }

  // Optionally delete the history entry
  await supabase
    .from('task_action_history')
    .delete()
    .eq('id', lastAction.id)

  return true
}

/**
 * Create subtasks for a task
 */
export async function createSubtasks(
  taskId: string,
  subtasks: Array<{ content: string; estimated_duration: number }>
): Promise<DaySubtask[]> {
  const subtasksToInsert = subtasks.map((subtask, index) => ({
    task_id: taskId,
    content: subtask.content,
    estimated_duration: subtask.estimated_duration,
    position: index,
    completed: false
  }))

  const { data, error } = await supabase
    .from('day_assistant_subtasks')
    .insert(subtasksToInsert)
    .select()

  if (error) {
    console.error('Error creating subtasks:', error)
    return []
  }

  return data as DaySubtask[]
}

/**
 * Update subtask completion status
 */
export async function updateSubtaskCompletion(
  subtaskId: string,
  completed: boolean
): Promise<DaySubtask | null> {
  const updates: any = { completed }
  if (completed) {
    updates.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('day_assistant_subtasks')
    .update(updates)
    .eq('id', subtaskId)
    .select()
    .single()

  if (error) {
    console.error('Error updating subtask:', error)
    return null
  }

  return data as DaySubtask
}

/**
 * Record subtask feedback
 */
export async function recordSubtaskFeedback(
  feedback: Omit<SubtaskFeedback, 'id' | 'created_at'>
): Promise<boolean> {
  const { error } = await supabase
    .from('subtask_feedback')
    .insert(feedback)

  if (error) {
    console.error('Error recording feedback:', error)
    return false
  }

  return true
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string): Promise<UserDayPreferences | null> {
  const { data, error } = await supabase
    .from('user_day_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Create default preferences
      return await createDefaultPreferences(userId)
    }
    console.error('Error fetching preferences:', error)
    return null
  }

  return data as UserDayPreferences
}

/**
 * Create default user preferences
 */
async function createDefaultPreferences(userId: string): Promise<UserDayPreferences | null> {
  const { data, error } = await supabase
    .from('user_day_preferences')
    .insert({
      user_id: userId,
      default_detail_level: 'standard',
      preferred_step_duration: 15,
      preferences: {}
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating default preferences:', error)
    return null
  }

  return data as UserDayPreferences
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<UserDayPreferences>
): Promise<UserDayPreferences | null> {
  const { data, error } = await supabase
    .from('user_day_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating preferences:', error)
    return null
  }

  return data as UserDayPreferences
}

/**
 * Complete a task and all its subtasks
 */
export async function completeTask(taskId: string): Promise<DayTask | null> {
  const now = new Date().toISOString()

  // Complete the task
  const updatedTask = await updateTask(taskId, {
    completed: true,
    completed_at: now
  })

  if (!updatedTask) return null

  // Complete all subtasks
  await supabase
    .from('day_assistant_subtasks')
    .update({
      completed: true,
      completed_at: now
    })
    .eq('task_id', taskId)
    .eq('completed', false)

  return updatedTask
}
