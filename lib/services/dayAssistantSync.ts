/**
 * Day Assistant Sync Service
 * 
 * Handles bidirectional synchronization between Todoist and Day Assistant tasks
 */

import { supabase } from '@/lib/supabaseClient'
import { DayPriority } from '@/lib/types/dayAssistant'

/**
 * Client-side token cache (per browser session)
 * NOTE: This is safe for client-side use as each browser session has its own instance.
 * Module-level variables are isolated per user's browser, not shared across users.
 */
let cachedTodoistToken: string | null = null
let cachedTokenUserId: string | null = null // Track which user's token is cached
let tokenCacheTimestamp: number = 0
const TOKEN_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Debounce log messages to reduce spam
let lastMissingTokenLogTime = 0
const MIN_LOG_INTERVAL = 30000 // 30 seconds

/**
 * Get cached Todoist token or fetch from database
 * Caches token for 5 minutes to avoid repeated DB queries
 * Cache hierarchy: memory cache → localStorage → database
 */
async function getCachedTodoistToken(userId: string): Promise<string | null> {
  const now = Date.now()
  
  // Invalidate cache if userId changed (edge case: user logout/login in same session)
  if (cachedTokenUserId && cachedTokenUserId !== userId) {
    cachedTodoistToken = null
    cachedTokenUserId = null
    tokenCacheTimestamp = 0
  }
  
  // Return cached token if still valid and for correct user
  if (cachedTodoistToken && cachedTokenUserId === userId && (now - tokenCacheTimestamp) < TOKEN_CACHE_DURATION) {
    return cachedTodoistToken
  }
  
  // Try to get from localStorage (faster than DB)
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('todoist_token')
    if (localToken) {
      // Cache in memory for faster subsequent access
      cachedTodoistToken = localToken
      cachedTokenUserId = userId
      tokenCacheTimestamp = now
      return localToken
    }
  }
  
  // Fallback: fetch from database (slowest but authoritative)
  try {
    const { getTodoistToken } = await import('@/lib/integrations')
    const token = await getTodoistToken(userId)
    
    if (token) {
      // Sync token to both memory and localStorage
      cachedTodoistToken = token
      cachedTokenUserId = userId
      tokenCacheTimestamp = now
      if (typeof window !== 'undefined') {
        localStorage.setItem('todoist_token', token)
      }
    }
    
    return token
  } catch (error) {
    console.error('[getCachedTodoistToken] Error fetching token:', error)
    return null
  }
}

/**
 * Clear cached token (call this when user disconnects Todoist)
 */
export function clearTodoistTokenCache() {
  cachedTodoistToken = null
  cachedTokenUserId = null
  tokenCacheTimestamp = 0
  if (typeof window !== 'undefined') {
    localStorage.removeItem('todoist_token')
  }
}

/**
 * Main sync function: Todoist → Day Assistant
 * 
 * Fetches tasks from Todoist API and syncs them to day_assistant_tasks table
 */
export async function syncWithTodoist(userId: string): Promise<{ success: boolean; taskCount: number }> {
  try {
    // 1. Get cached token (avoids DB flapping)
    const token = await getCachedTodoistToken(userId)
    
    if (!token) {
      // Debounced logging to reduce spam
      const now = Date.now()
      if (now - lastMissingTokenLogTime > MIN_LOG_INTERVAL) {
        console.warn('⚠️ [syncWithTodoist] Todoist token: MISSING – skipping sync')
        lastMissingTokenLogTime = now
      }
      return { success: false, taskCount: 0 }
    }
    
    // 2. Fetch tasks from Todoist
    const response = await fetch('/api/todoist/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token,
        filter: 'all' 
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Todoist tasks: ${response.status}`)
    }
    
    const { tasks } = await response.json()
    
    if (!Array.isArray(tasks)) {
      console.error('[syncWithTodoist] Invalid tasks response:', tasks)
      throw new Error('Invalid tasks response from Todoist API')
    }
    
    console.log(`✅ [syncWithTodoist] Fetched ${tasks.length} tasks from Todoist API`)
    
    // 3. Upsert each task to day_assistant_tasks
    let successCount = 0
    let errorCount = 0
    for (const task of tasks) {
      const result = await upsertTaskFromTodoist(userId, task)
      if (result) {
        successCount++
      } else {
        errorCount++
      }
    }
    
    console.log(`✅ [syncWithTodoist] Upserted ${successCount} tasks, ${errorCount} errors`)
    
    // 4. Remove tasks that no longer exist in Todoist
    const todoistTaskIds = tasks.map((t: any) => t.id)
    await removeDeletedTasks(userId, todoistTaskIds)
    
    // 5. Update last sync timestamp in localStorage (client-side)
    if (typeof window !== 'undefined') {
      localStorage.setItem('day_assistant_last_sync', Date.now().toString())
    }
    
    console.log(`✅ [syncWithTodoist] Successfully synced ${tasks.length} tasks`)
    
    return { success: true, taskCount: tasks.length }
  } catch (error) {
    console.error('❌ Sync error:', error)
    return { success: false, taskCount: 0 }
  }
}

/**
 * Upsert a single Todoist task to day_assistant_tasks
 */
async function upsertTaskFromTodoist(userId: string, todoistTask: any): Promise<boolean> {
  try {
    // Map Todoist task to Day Assistant priority
    const priority = mapTodoistPriorityToDayPriority(todoistTask)
    
    // Check if task already exists
    const { data: existingTask } = await supabase
      .from('day_assistant_tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('todoist_task_id', todoistTask.id)
      .single()
    
    const taskData = {
      user_id: userId,
      todoist_task_id: todoistTask.id,
      title: todoistTask.content,
      description: todoistTask.description || null,
      priority: priority,
      estimated_duration: todoistTask.duration?.amount || 15,
      due_date: todoistTask.due?.date || null,
      completed: false,
      is_pinned: false,
      is_mega_important: todoistTask.priority === 4,
      energy_mode_required: 'normal' as const,
      position: 0,
      metadata: {
        todoist_priority: todoistTask.priority,
        todoist_project_id: todoistTask.project_id,
        todoist_labels: todoistTask.labels || []
      }
    }
    
    if (existingTask) {
      // Update existing task
      const { error } = await supabase
        .from('day_assistant_tasks')
        .update(taskData)
        .eq('id', existingTask.id)
      
      if (error) {
        console.error(`[upsertTask] Error updating task ${todoistTask.id}:`, error)
        return false
      }
      console.log(`[upsertTask] Updated task: ${todoistTask.content} (priority: ${priority})`)
    } else {
      // Insert new task
      const { error } = await supabase
        .from('day_assistant_tasks')
        .insert(taskData)
      
      if (error) {
        console.error(`[upsertTask] Error inserting task ${todoistTask.id}:`, error)
        return false
      }
      console.log(`[upsertTask] Inserted task: ${todoistTask.content} (priority: ${priority})`)
    }
    return true
  } catch (error) {
    console.error(`[upsertTask] Error upserting task ${todoistTask.id}:`, error)
    return false
  }
}

/**
 * Map Todoist priority to Day Assistant priority
 * 
 * Logic:
 * - Check labels first (@now, @next, @later)
 * - Fallback to Todoist priority:
 *   - Priority 4 (urgent) → now
 *   - Priority 2-3 (medium/high) → next
 *   - Priority 1 (normal) → later
 */
function mapTodoistPriorityToDayPriority(task: any): DayPriority {
  const labels = task.labels || []
  
  // Check labels first (highest priority)
  if (labels.includes('@now')) return 'now'
  if (labels.includes('@next')) return 'next'
  if (labels.includes('@later')) return 'later'
  
  // Fallback: use Todoist priority
  // Todoist: 1=normal, 2=medium, 3=high, 4=urgent
  if (task.priority === 4) return 'now'
  if (task.priority >= 2) return 'next'
  
  return 'later'
}

/**
 * Remove tasks from day_assistant_tasks that no longer exist in Todoist
 */
async function removeDeletedTasks(userId: string, todoistTaskIds: string[]): Promise<void> {
  try {
    if (todoistTaskIds.length === 0) {
      // If no Todoist tasks, don't delete anything (might be API error)
      return
    }
    
    // Get all existing Todoist tasks for this user
    const { data: existingTasks, error: fetchError } = await supabase
      .from('day_assistant_tasks')
      .select('id, todoist_task_id')
      .eq('user_id', userId)
      .not('todoist_task_id', 'is', null)
    
    if (fetchError) {
      console.error('Error fetching existing tasks:', fetchError)
      return
    }
    
    // Find tasks that no longer exist in Todoist
    const tasksToDelete = (existingTasks || []).filter(
      task => !todoistTaskIds.includes(task.todoist_task_id!)
    )
    
    // Delete them one by one (or in batches)
    if (tasksToDelete.length > 0) {
      console.log(`[removeDeletedTasks] Removing ${tasksToDelete.length} tasks that no longer exist in Todoist`)
    }
    
    for (const task of tasksToDelete) {
      const { error } = await supabase
        .from('day_assistant_tasks')
        .delete()
        .eq('id', task.id)
      
      if (error) {
        console.error(`[removeDeletedTasks] Error deleting task ${task.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error in removeDeletedTasks:', error)
  }
}

/**
 * Sync Day Assistant task change back to Todoist
 * 
 * Updates Todoist task labels based on Day Assistant priority
 */
export async function syncTaskToTodoist(
  taskId: string,
  newPriority: DayPriority
): Promise<boolean> {
  try {
    // 1. Get task details
    const { data: task, error: taskError } = await supabase
      .from('day_assistant_tasks')
      .select('todoist_task_id, user_id')
      .eq('id', taskId)
      .single()
    
    if (taskError || !task?.todoist_task_id) {
      // Task might not be from Todoist, that's ok
      return false
    }
    
    // 2. Get cached Todoist token
    const token = await getCachedTodoistToken(task.user_id)
    
    if (!token) {
      console.warn('⚠️ [syncTaskToTodoist] No Todoist token available')
      return false
    }
    
    // 3. Update Todoist task labels
    const labels = priorityToTodoistLabels(newPriority)
    
    const response = await fetch('/api/todoist/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.todoist_task_id,
        token,
        labels
      })
    })
    
    if (!response.ok) {
      console.error('Failed to update Todoist task:', response.status)
      return false
    }
    
    console.log(`✅ Synced task ${taskId} to Todoist with priority ${newPriority}`)
    return true
  } catch (error) {
    console.error('Error syncing to Todoist:', error)
    return false
  }
}

/**
 * Convert Day Assistant priority to Todoist labels
 */
function priorityToTodoistLabels(priority: DayPriority): string[] {
  switch (priority) {
    case 'now':
      return ['@now']
    case 'next':
      return ['@next']
    case 'later':
      return ['@later']
    default:
      return []
  }
}

/**
 * Check if sync is needed (throttle to prevent too frequent syncs)
 */
export function shouldSync(): boolean {
  if (typeof window === 'undefined') return false
  
  const lastSync = localStorage.getItem('day_assistant_last_sync')
  if (!lastSync) return true
  
  const now = Date.now()
  const lastSyncTime = parseInt(lastSync)
  
  // Sync if last sync was more than 60 seconds ago
  return now - lastSyncTime > 60000
}
