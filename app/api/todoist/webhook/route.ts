import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

let lastEventTime = 0

/**
 * Todoist Webhook Handler
 * 
 * Handles real-time events from Todoist:
 * - item:added - New task created
 * - item:updated - Task modified
 * - item:completed - Task marked as done
 * - item:deleted - Task deleted
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { event_name, event_data, user_id: todoistUserId } = body
    
    console.log('🔔 Webhook Todoist:', event_name, event_data?.id)
    
    // Update last event timestamp
    lastEventTime = Date.now()
    
    // Process event based on type
    switch (event_name) {
      case 'item:added':
      case 'item:updated':
        await handleTaskUpsert(event_data, todoistUserId)
        break
        
      case 'item:completed':
      case 'item:deleted':
        await handleTaskRemoval(event_data, todoistUserId)
        break
        
      default:
        console.log('Unhandled event type:', event_name)
    }
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Handle task creation/update from webhook
 */
async function handleTaskUpsert(taskData: any, todoistUserId: string) {
  try {
    // Find user by Todoist user ID (assuming it's stored in user_profiles)
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('todoist_user_id', todoistUserId)
    
    if (profileError || !profiles || profiles.length === 0) {
      console.warn('No user found for Todoist user ID:', todoistUserId)
      return
    }
    
    // Sync task for each user (in case multiple users have the same Todoist account)
    for (const profile of profiles) {
      await syncSingleTaskFromWebhook(profile.id, taskData)
    }
  } catch (error) {
    console.error('Error handling task upsert:', error)
  }
}

/**
 * Sync a single task from webhook data
 */
async function syncSingleTaskFromWebhook(userId: string, taskData: any) {
  try {
    // Map priority
    const priority = mapTodoistPriority(taskData)
    
    const taskPayload = {
      user_id: userId,
      todoist_task_id: taskData.id,
      title: taskData.content,
      description: taskData.description || null,
      priority: priority,
      estimated_duration: taskData.duration?.amount || 15,
      due_date: taskData.due?.date || null,
      completed: taskData.is_completed || false,
      is_pinned: false,
      is_mega_important: taskData.priority === 4,
      energy_mode_required: 'normal' as const,
      position: 0,
      metadata: {
        todoist_priority: taskData.priority,
        todoist_project_id: taskData.project_id,
        todoist_labels: taskData.labels || []
      }
    }
    
    // Check if task exists
    const { data: existing } = await supabase
      .from('day_assistant_tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('todoist_task_id', taskData.id)
      .single()
    
    if (existing) {
      // Update
      await supabase
        .from('day_assistant_tasks')
        .update(taskPayload)
        .eq('id', existing.id)
    } else {
      // Insert
      await supabase
        .from('day_assistant_tasks')
        .insert(taskPayload)
    }
    
    console.log('✅ Synced task from webhook:', taskData.id)
  } catch (error) {
    console.error('Error syncing task from webhook:', error)
  }
}

/**
 * Handle task completion/deletion from webhook
 */
async function handleTaskRemoval(taskData: any, todoistUserId: string) {
  try {
    // Find user
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('todoist_user_id', todoistUserId)
    
    if (profileError || !profiles || profiles.length === 0) {
      return
    }
    
    // Remove task for each user
    for (const profile of profiles) {
      await supabase
        .from('day_assistant_tasks')
        .delete()
        .eq('user_id', profile.id)
        .eq('todoist_task_id', taskData.id)
    }
    
    console.log('✅ Removed task from webhook:', taskData.id)
  } catch (error) {
    console.error('Error removing task from webhook:', error)
  }
}

/**
 * Map Todoist priority to Day Assistant priority
 */
function mapTodoistPriority(task: any): 'now' | 'next' | 'later' {
  const labels = task.labels || []
  
  // Check labels first
  if (labels.includes('@now')) return 'now'
  if (labels.includes('@next')) return 'next'
  if (labels.includes('@later')) return 'later'
  
  // Fallback: use Todoist priority
  if (task.priority === 4) return 'now'
  if (task.priority >= 2) return 'next'
  
  return 'later'
}

export async function GET() {
  // Return timestamp of last event (for client-side checking)
  return NextResponse.json({ lastEventTime })
}
