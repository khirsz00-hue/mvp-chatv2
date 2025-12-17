/**
 * API Route: /api/day-assistant-v2/init
 * POST: Initialize day assistant v2 for user
 * Returns confirmation message
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOrCreateDayAssistantV2 } from '@/lib/services/dayAssistantV2Service'
import { DEFAULT_SETTINGS } from '@/lib/types/dayAssistantV2'

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
    const assistant = await getOrCreateDayAssistantV2(user.id)
    
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
    console.error('Error in POST /api/day-assistant-v2/init:', error)
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
    
    // Get existing assistant (without creating a new one)
    const { data: assistant, error } = await supabase
      .from('assistant_config')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', 'asystent dnia v2')
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching existing assistant:', error)
      return NextResponse.json({ error: 'Failed to fetch assistant' }, { status: 500 })
    }
    
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      assistant,
      message: generateConfirmationMessage(assistant)
    })
  } catch (error) {
    console.error('Error in GET /api/day-assistant-v2/init:', error)
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
  
  // Required confirmation message
  const confirmation = 'Utworzyłem asystenta: asystent dnia v2 — gotowy do działania'
  
  // Keep detailed settings context for clients that display more info
  return `${confirmation}. Domyślne ustawienia: undo ${undoWindow}s, max_postpones_before_escalation ${maxPostpones}, morning_must_block ${morningBlock} min. Chcesz zmienić progi lub presety?`
}
