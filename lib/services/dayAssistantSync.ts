/**
 * Day Assistant Sync Service
 * 
 * Handles bidirectional synchronization between Todoist and Day Assistant tasks
 */

import { supabase } from '@/lib/supabaseClient'
import { DayPriority } from '@/lib/types/dayAssistant'

/**
 * Main sync function: Todoist → Day Assistant
 * 
 * Fetches tasks from Todoist API and syncs them to day_assistant_tasks table
 */
export async function syncWithTodoist(userId: string): Promise<{ success: boolean; taskCount: number }> {
  try {
    // 1. Fetch Todoist token from user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('todoist_token')
      .eq('id', userId)
      .single()
    
    if (profileError || !profile?.todoist_token) {
      console.warn('[syncWithTodoist] No Todoist token found for user:', userId)
      return { success: false, taskCount: 0 }
    }
    
    // 2. Fetch tasks from Todoist
    const response = await fetch('/api/todoist/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: profile.todoist_token,
        filter: 'all' 
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Todoist tasks: ${response.status}`)
    }
    
    const { tasks } = await response.json()
    
    if (!Array.isArray(tasks)) {
      throw new Error('Invalid tasks response from Todoist API')
    }
    
    // 3. Upsert each task to day_assistant_tasks
    for (const task of tasks) {
      await upsertTaskFromTodoist(userId, task)
    }
    
    // 4. Remove tasks that no longer exist in Todoist
    const todoistTaskIds = tasks.map((t: any) => t.id)
    await removeDeletedTasks(userId, todoistTaskIds)
    
    // 5. Update last sync timestamp in localStorage (client-side)
    if (typeof window !== 'undefined') {
      localStorage.setItem('day_assistant_last_sync', Date.now().toString())
    }
    
    console.log(`✅ Synced ${tasks.length} tasks from Todoist for user ${userId}`)
    
    return { success: true, taskCount: tasks.length }
  } catch (error) {
    console.error('❌ Sync error:', error)
    return { success: false, taskCount: 0 }
  }
}

/**
 * Upsert a single Todoist task to day_assistant_tasks
 */
async function upsertTaskFromTodoist(userId: string, todoistTask: any): Promise<void> {
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
        console.error('Error updating task:', error)
      }
    } else {
      // Insert new task
      const { error } = await supabase
        .from('day_assistant_tasks')
        .insert(taskData)
      
      if (error) {
        console.error('Error inserting task:', error)
      }
    }
  } catch (error) {
    console.error('Error upserting task:', error)
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
    
    const { error } = await supabase
      .from('day_assistant_tasks')
      .delete()
      .eq('user_id', userId)
      .not('todoist_task_id', 'is', null)
      .not('todoist_task_id', 'in', `(${todoistTaskIds.join(',')})`)
    
    if (error) {
      console.error('Error removing deleted tasks:', error)
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
    
    // 2. Get user's Todoist token
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('todoist_token')
      .eq('id', task.user_id)
      .single()
    
    if (profileError || !profile?.todoist_token) {
      console.warn('[syncTaskToTodoist] No Todoist token found')
      return false
    }
    
    // 3. Update Todoist task labels
    const labels = priorityToTodoistLabels(newPriority)
    
    const response = await fetch('/api/todoist/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.todoist_task_id,
        token: profile.todoist_token,
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
