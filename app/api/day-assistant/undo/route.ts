import { NextRequest, NextResponse } from 'next/server'
import { undoLastAction } from '@/lib/services/dayAssistantService'
import { validateUUID } from '@/lib/validation/uuid'

/**
 * POST /api/day-assistant/undo
 * 
 * Undo the last action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    console.log('🔍 [API Undo] Received userId:', userId)

    // Validate userId
    const validationError = validateUUID(userId)
    if (validationError) {
      console.error('❌ [API Undo]', validationError)
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const success = await undoLastAction(userId)

    if (!success) {
      console.log('⚠️ [API Undo] No action to undo')
      return NextResponse.json(
        { error: 'No action to undo or failed to undo' },
        { status: 404 }
      )
    }

    console.log('✅ [API Undo] Action undone successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in undo route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
