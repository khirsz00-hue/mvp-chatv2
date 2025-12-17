/**
 * API Route: /api/day-assistant-v2/task
 * POST: Create a new task
 * PUT: Update task
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2,
  createTask,
  updateTask,
  getTasks,
  getMustTasksCount,
  getOrCreateDayPlan
} from '@/lib/services/dayAssistantV2Service'
import { generateTaskAddedRecommendation } from '@/lib/services/dayAssistantV2RecommendationEngine'

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
    
    // Create task
    const newTask = await createTask(user.id, assistant.id, body)
    if (!newTask) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }
    
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
    
    // Update task
    const updatedTask = await updateTask(task_id, updates)
    if (!updatedTask) {
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
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
