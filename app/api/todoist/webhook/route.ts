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
    
    console.log('🔔 [Webhook] Todoist event received:', {
      event: event_name,
      task_id: event_data?.id,
      todoist_user_id: todoistUserId,
      task_content: event_data?.content
    })
    
    // Validate required fields
    if (!todoistUserId) {
      console.error('❌ [Webhook] Missing user_id in webhook payload')
      return NextResponse.json({ ok: false, error: 'Missing user_id' }, { status: 400 })
    }
    
    if (!event_data?.id) {
      console.error('❌ [Webhook] Missing event_data.id in webhook payload')
      return NextResponse.json({ ok: false, error: 'Missing event data' }, { status: 400 })
    }
    
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
        console.log('⚠️ [Webhook] Unhandled event type:', event_name)
    }
    
    console.log('✅ [Webhook] Event processed successfully')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ [Webhook] Error processing webhook:', error)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Handle task creation/update from webhook
 */
async function handleTaskUpsert(taskData: any, todoistUserId: string) {
  try {
    console.log(`🔍 [Webhook] Looking up user for Todoist user ID: ${todoistUserId}`)
    
    // Find user by Todoist user ID (assuming it's stored in user_profiles)
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('todoist_user_id', todoistUserId)
    
    if (profileError) {
      console.error('❌ [Webhook] Error querying user_profiles:', profileError)
      return
    }
    
    if (!profiles || profiles.length === 0) {
      console.warn(`⚠️ [Webhook] No user found for Todoist user ID: ${todoistUserId}`)
      console.log('🔍 [Webhook] This might mean the user needs to reconnect their Todoist account')
      return
    }
    
    console.log(`✅ [Webhook] Found ${profiles.length} user(s) for Todoist ID ${todoistUserId}`)
    
    // Sync task for each user (in case multiple users have the same Todoist account)
    for (const profile of profiles) {
      console.log(`📝 [Webhook] Syncing task "${taskData.content}" for user ${profile.id}`)
      await syncSingleTaskFromWebhook(profile.id, taskData)
    }
  } catch (error) {
    console.error('❌ [Webhook] Error handling task upsert:', error)
  }
}

/**
 * Sync a single task from webhook data
 */
async function syncSingleTaskFromWebhook(userId: string, taskData: any) {
  try {
    console.log(`📝 [Webhook] Syncing task for user ${userId}:`, {
      task_id: taskData.id,
      content: taskData.content,
      priority: taskData.priority,
      completed: taskData.is_completed
    })
    
    // Get or create assistant for day_assistant_v2
    // Try to find existing assistant from day_assistant_v2_assistants table
    const { data: assistant } = await supabase
      .from('day_assistant_v2_assistants')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (!assistant) {
      console.warn(`⚠️ [Webhook] No assistant found for user ${userId}`)
      return
    }

    const assistantId = assistant.id
    
    // Map Todoist priority to internal priority (1-4)
    const priority = taskData.priority || 1
    
    const taskPayload = {
      user_id: userId,
      assistant_id: assistantId,
      todoist_id: taskData.id,
      todoist_task_id: taskData.id, // Legacy field for compatibility
      title: taskData.content,
      description: taskData.description || null,
      priority: priority,
      is_must: false, // Webhooks don't auto-pin
      is_important: priority >= 3,
      estimate_min: taskData.duration?.amount || 30,
      cognitive_load: 2, // Default medium load
      context_type: 'deep_work', // Default context
      due_date: taskData.due?.date || null,
      completed: taskData.is_completed || false,
      position: 0,
      postpone_count: 0,
      auto_moved: false,
      tags: [],
      metadata: {
        todoist_priority: taskData.priority,
        project_id: taskData.project_id,
        todoist_labels: taskData.labels || []
      },
      synced_at: new Date().toISOString()
    }
    
    // Check if task exists in day_assistant_v2_tasks
    const { data: existing } = await supabase
      .from('day_assistant_v2_tasks')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('assistant_id', assistantId)
      .eq('todoist_id', taskData.id)
      .single()
    
    if (existing) {
      // Check if task was manually updated recently (within last 60 seconds)
      const updatedAt = new Date(existing.updated_at).getTime()
      const timeSinceUpdate = Date.now() - updatedAt
      
      console.log(`🕐 [Webhook] Task update timing:`, {
        task_id: taskData.id,
        updated_at: existing.updated_at,
        seconds_since_update: Math.floor(timeSinceUpdate / 1000),
        will_skip: timeSinceUpdate < 60000
      })
      
      if (timeSinceUpdate < 60000) {
        console.log(`⏭️ [Webhook] Skipping update - task was manually updated ${Math.floor(timeSinceUpdate / 1000)}s ago`)
        return
      }
      
      // Update existing task
      const { error: updateError } = await supabase
        .from('day_assistant_v2_tasks')
        .update(taskPayload)
        .eq('id', existing.id)
        
      if (updateError) {
        console.error('❌ [Webhook] Error updating task:', updateError)
      } else {
        console.log('✅ [Webhook] Updated task from webhook:', taskData.id)
      }
    } else {
      // Insert new task
      const { error: insertError } = await supabase
        .from('day_assistant_v2_tasks')
        .insert(taskPayload)
        
      if (insertError) {
        console.error('❌ [Webhook] Error inserting task:', insertError)
      } else {
        console.log('✅ [Webhook] Inserted task from webhook:', taskData.id)
      }
    }
  } catch (error) {
    console.error('❌ [Webhook] Error syncing task from webhook:', error)
  }
}

/**
 * Handle task completion/deletion from webhook
 */
async function handleTaskRemoval(taskData: any, todoistUserId: string) {
  try {
    console.log(`🔍 [Webhook] Looking up user for task removal, Todoist user ID: ${todoistUserId}`)
    
    // Find user
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('todoist_user_id', todoistUserId)
    
    if (profileError) {
      console.error('❌ [Webhook] Error querying user_profiles for removal:', profileError)
      return
    }
    
    if (!profiles || profiles.length === 0) {
      console.warn(`⚠️ [Webhook] No user found for Todoist user ID: ${todoistUserId} (removal)`)
      return
    }
    
    console.log(`✅ [Webhook] Found ${profiles.length} user(s) for task removal`)
    
    // Remove task for each user
    for (const profile of profiles) {
      console.log(`🗑️ [Webhook] Removing task ${taskData.id} for user ${profile.id}`)
      
      // Delete from day_assistant_v2_tasks using todoist_id
      await supabase
        .from('day_assistant_v2_tasks')
        .delete()
        .eq('user_id', profile.id)
        .eq('todoist_id', taskData.id)
    }
    
    console.log('✅ [Webhook] Removed task from webhook:', taskData.id)
  } catch (error) {
    console.error('❌ [Webhook] Error removing task from webhook:', error)
  }
}

export async function GET() {
  // Return timestamp of last event (for client-side checking)
  return NextResponse.json({ lastEventTime })
}
