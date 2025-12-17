/**
 * API Route: /api/test-day-assistant/init
 * POST: Initialize test day assistant for user
 * Returns confirmation message
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOrCreateTestDayAssistant } from '@/lib/services/testDayAssistantService'
import { DEFAULT_SETTINGS } from '@/lib/types/testDayAssistant'

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
    
    // Create or get the assistant
    const assistant = await getOrCreateTestDayAssistant(user.id)
    
    if (!assistant) {
      return NextResponse.json(
        { error: 'Failed to create assistant' },
        { status: 500 }
      )
    }
    
    // Generate confirmation message
    const confirmationMessage = generateConfirmationMessage(assistant)
    
    return NextResponse.json({
      success: true,
      assistant,
      message: confirmationMessage
    })
  } catch (error) {
    console.error('Error in POST /api/test-day-assistant/init:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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
    
    // Get existing assistant
    const assistant = await getOrCreateTestDayAssistant(user.id)
    
    if (!assistant) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      assistant,
      message: 'Assistant retrieved successfully'
    })
  } catch (error) {
    console.error('Error in GET /api/test-day-assistant/init:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate confirmation message as per requirements
 */
function generateConfirmationMessage(assistant: any): string {
  const settings = assistant.settings || DEFAULT_SETTINGS
  
  const undoWindow = settings.undo_window || DEFAULT_SETTINGS.undo_window
  const maxPostpones = settings.max_postpones_before_escalation || DEFAULT_SETTINGS.max_postpones_before_escalation
  const morningBlock = settings.morning_must_block_default || DEFAULT_SETTINGS.morning_must_block_default
  
  return `Utworzyłem asystenta: asystent dnia test — gotowy do działania. Domyślne ustawienia: undo ${undoWindow}s, max_postpones_before_escalation ${maxPostpones}, morning_must_block ${morningBlock} min. Chcesz zmienić progi lub presety?`
}
