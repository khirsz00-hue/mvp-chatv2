import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface TaskAnalyticsData {
  user_id: string
  task_id: string
  task_title: string
  task_project?: string
  task_labels?: string[]
  priority?: number
  estimated_duration?: number
  actual_duration?: number
  due_date?: string
  completed_date?: string
  action_type: 'created' | 'completed' | 'postponed' | 'deleted'
  postponed_from?: string
  postponed_to?: string
  completion_speed?: 'early' | 'on-time' | 'late'
  metadata?: Record<string, any>
}

export async function POST(req: Request) {
  try {
    const data: TaskAnalyticsData = await req.json()
    
    // Validate required fields
    if (!data.user_id || !data.task_id || !data.task_title || !data.action_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Insert analytics data
    const { data: result, error } = await supabase
      .from('user_task_analytics')
      .insert({
        user_id: data.user_id,
        task_id: data.task_id,
        task_title: data.task_title,
        task_project: data.task_project || null,
        task_labels: data.task_labels || null,
        priority: data.priority || null,
        estimated_duration: data.estimated_duration || null,
        actual_duration: data.actual_duration || null,
        due_date: data.due_date || null,
        completed_date: data.completed_date || null,
        action_type: data.action_type,
        postponed_from: data.postponed_from || null,
        postponed_to: data.postponed_to || null,
        completion_speed: data.completion_speed || null,
        metadata: data.metadata || null
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error inserting task analytics:', error)
      return NextResponse.json(
        { error: 'Failed to track task analytics' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    console.error('Error in track-task:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get analytics for a user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('user_task_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ analytics: data })
  } catch (err: any) {
    console.error('Error in GET track-task:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
