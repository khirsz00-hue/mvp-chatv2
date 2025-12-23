/**
 * API Route: /api/day-assistant-v2/complete
 * POST: Mark task as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2,
  syncTaskChangeToTodoist
} from '@/lib/services/dayAssistantV2Service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Complete] Starting task completion request')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Complete] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('🔍 [Complete] User authenticated:', user.id)
    
    const body = await request.json()
    const { task_id } = body
    
    if (!task_id) {
      console.error('❌ [Complete] Missing task_id')
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
    }
    
    console.log('🔍 [Complete] Task ID:', task_id)
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      console.error('❌ [Complete] Failed to get assistant')
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    console.log('🔍 [Complete] Assistant found:', assistant.id)
    
    // Get task to check for todoist_id
    const { data: task, error: taskFetchError } = await supabase
      .from('day_assistant_v2_tasks')
      .select('id, title, todoist_id, todoist_task_id')
      .eq('id', task_id)
      .single()
    
    if (taskFetchError) {
      console.error('❌ [Complete] Error fetching task:', taskFetchError)
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    console.log('🔍 [Complete] Task found:', task.title)
    console.log('🔍 [Complete] Todoist ID:', task.todoist_id || task.todoist_task_id || 'NONE')
    
    // Mark as completed in our database FIRST (graceful degradation)
    const { data: updatedTask, error: updateError } = await supabase
      .from('day_assistant_v2_tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', task_id)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ [Complete] Error updating task in database:', updateError)
      console.error('❌ [Complete] Error details:', JSON.stringify(updateError, null, 2))
      return NextResponse.json({ error: 'Failed to complete task in database' }, { status: 500 })
    }
    
    console.log('✅ [Complete] Task marked as completed in database')
    
    // Sync to Todoist (with retry and graceful failure)
    const todoistRef = task?.todoist_id ?? task?.todoist_task_id
    let todoistSyncSuccess = false
    let todoistSyncError = null
    
    if (todoistRef) {
      console.log('🔍 [Complete] Syncing to Todoist...')
      try {
        todoistSyncSuccess = await syncTaskChangeToTodoist(user.id, todoistRef, {
          completed: true
        })
        
        if (todoistSyncSuccess) {
          console.log('✅ [Complete] Todoist sync successful')
        } else {
          console.warn('⚠️ [Complete] Todoist sync failed (returned false)')
          todoistSyncError = 'Todoist sync returned false'
        }
      } catch (syncError) {
        console.error('❌ [Complete] Todoist sync error:', syncError)
        todoistSyncError = syncError instanceof Error ? syncError.message : 'Unknown error'
      }
    } else {
      console.log('🔍 [Complete] No Todoist ID - skipping sync (local-only task)')
    }
    
    // Return success with appropriate message
    let message = '✅ Zadanie ukończone'
    let warning = null
    
    if (todoistRef && !todoistSyncSuccess) {
      message = '✅ Zadanie ukończone lokalnie'
      warning = 'Nie udało się zsynchronizować z Todoist - zadanie ukończone tylko lokalnie'
      console.warn('⚠️ [Complete] Task completed locally but Todoist sync failed')
    } else if (!todoistRef) {
      console.log('✅ [Complete] Task completed (local-only, no Todoist sync needed)')
    } else {
      console.log('✅ [Complete] Task completed successfully with Todoist sync')
    }
    
    return NextResponse.json({
      success: true,
      task: updatedTask,
      message,
      warning,
      todoist_synced: todoistSyncSuccess,
      todoist_error: todoistSyncError
    })
  } catch (error) {
    console.error('❌ [Complete] Unexpected error:', error)
    if (error instanceof Error) {
      console.error('❌ [Complete] Error name:', error.name)
      console.error('❌ [Complete] Error message:', error.message)
      console.error('❌ [Complete] Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
