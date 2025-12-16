import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { generateSubtasks } from '@/lib/services/dayAssistantAI'
import { getUserPreferences } from '@/lib/services/dayAssistantService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/day-assistant/subtasks/generate
 * 
 * Generate subtasks using AI
 * Uses authenticated user context via RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      task_id,
      task_title,
      task_description,
      detail_level,
      energy_mode
    } = body

    if (!task_id || !task_title || !detail_level || !energy_mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user preferences
    const userPreferences = await getUserPreferences(user.id)

    // Generate subtasks
    const result = await generateSubtasks({
      task_id,
      task_title,
      task_description,
      detail_level,
      energy_mode,
      user_preferences: userPreferences || undefined
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in subtasks generate route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
