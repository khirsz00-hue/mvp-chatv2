import { NextRequest, NextResponse } from 'next/server'
import { generateSubtasks } from '@/lib/services/dayAssistantAI'
import { getUserPreferences } from '@/lib/services/dayAssistantService'

/**
 * POST /api/day-assistant/subtasks/generate
 * 
 * Generate subtasks using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      task_id,
      task_title,
      task_description,
      detail_level,
      energy_mode,
      userId
    } = body

    if (!task_id || !task_title || !detail_level || !energy_mode || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user preferences
    const userPreferences = await getUserPreferences(userId)

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
