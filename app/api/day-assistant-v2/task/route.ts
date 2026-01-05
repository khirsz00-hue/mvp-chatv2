/**
 * API Route: /api/day-assistant-v2/task
 * POST: Create a new task
 * PUT: Update task
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2,
  createTask,
  updateTask,
  getTasks,
  getMustTasksCount,
  getOrCreateDayPlan,
  syncTaskChangeToTodoist,
  type TodoistUpdatePayload
} from '@/lib/services/dayAssistantV2Service'
import { generateTaskAddedRecommendation } from '@/lib/services/dayAssistantV2RecommendationEngine'
import { inferTaskContext } from '@/lib/services/contextInferenceService'

async function getTodoistToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('todoist_token')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[day-assistant-v2/task] Failed to load Todoist token:', error)
    return null
  }

  return data?.todoist_token || null
}

async function createTodoistTask(
  token: string,
  payload: {
    title: string
    description?: string
    due_date?: string
    priority?: number
  }
): Promise<string | null> {
  try {
    const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: payload.title,
        description: payload.description,
        due_date: payload.due_date,
        priority: payload.priority || 3
      })
    })

    if (!response.ok) {
      console.warn('[day-assistant-v2/task] Todoist create failed with status', response.status)
      return null
    }

    const data = await response.json()
    return data?.id || null
  } catch (error) {
    console.error('[day-assistant-v2/task] Error creating Todoist task:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    console.log('🎯 [API] Received priority:', body.priority)
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Check MUST task limit if marking as MUST
    if (body.is_must && body.due_date) {
      const mustCount = await getMustTasksCount(user.id, assistant.id, body.due_date)
      if (mustCount >= 3) {
        return NextResponse.json({
          error: 'Limit MUST tasks reached',
          message: 'Maksymalnie 3 zadania MUST dziennie',
          mustCount
        }, { status: 400 })
      }
    }

    // If user didn't specify context, use AI inference
    let finalContext = body.context_type
    
    if (!finalContext) {
      try {
        const inference = await inferTaskContext(body.title, body.description)
        finalContext = inference.context
        console.log('[Task Create] AI inferred context:', finalContext, 'confidence:', inference.confidence)
      } catch (error) {
        console.error('[Task Create] Error inferring context:', error)
        finalContext = 'deep_work' // Default fallback
      }
    }

    const todoistToken = await getTodoistToken(supabase, user.id)
    const todoistTaskId = todoistToken
      ? await createTodoistTask(todoistToken, {
          title: body.title,
          description: body.description,
          due_date: body.due_date,
          priority: body.priority
        })
      : null
    
    // Create task with AI-inferred or user-specified context
    const newTask = await createTask(user.id, assistant.id, {
      ...body,
      context_type: finalContext,
      // Keep both fields to support legacy consumers that still rely on todoist_task_id
      todoist_task_id: todoistTaskId,
      todoist_id: todoistTaskId
    })
    if (!newTask) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }
    
    console.log('🎯 [API] Created task with priority:', newTask.priority)
    
    // Generate recommendation if task is for today
    let proposal = null
    if (body.due_date) {
      const today = new Date().toISOString().split('T')[0]
      if (body.due_date === today) {
        const allTasks = await getTasks(user.id, assistant.id, { date: today })
        const dayPlan = await getOrCreateDayPlan(user.id, assistant.id, today)
        
        if (dayPlan && allTasks.length > 1) {
          proposal = await generateTaskAddedRecommendation(
            user.id,
            assistant.id,
            assistant,
            newTask.id,
            allTasks,
            dayPlan,
            today
          )
        }
      }
    }
    
    return NextResponse.json({
      task: newTask,
      proposal,
      message: 'Task created successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { task_id, ...updates } = body
    
    if (!task_id) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
    }
    
    const todoistToken = await getTodoistToken(supabase, user.id)
    
    // Update task
    const updatedTask = await updateTask(task_id, updates)
    if (!updatedTask) {
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }
    
    // Sync to Todoist if task is from Todoist
    const todoistRef = updatedTask.todoist_id ?? updatedTask.todoist_task_id
    if (todoistRef) {
      const todoistUpdates: TodoistUpdatePayload = {}
      
      // Map Supabase fields to Todoist fields
      if (updates.title !== undefined) todoistUpdates.content = updates.title
      if (updates.description !== undefined) todoistUpdates.description = updates.description
      if (updates.due_date !== undefined) todoistUpdates.due_date = updates.due_date
      if (updates.tags) todoistUpdates.labels = updates.tags
      if (updates.completed !== undefined) todoistUpdates.completed = updates.completed
      
      // Only sync if there are actual changes to sync
      if (Object.keys(todoistUpdates).length > 0) {
        await syncTaskChangeToTodoist(user.id, todoistRef, todoistUpdates)
      }
    }
    
    return NextResponse.json({
      task: updatedTask,
      message: 'Task updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT /api/day-assistant-v2/task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
