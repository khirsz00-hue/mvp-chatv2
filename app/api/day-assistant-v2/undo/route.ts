/**
 * API Route: /api/day-assistant-v2/undo
 * POST: Undo last action (within undo window)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2,
  undoLastAction
} from '@/lib/services/dayAssistantV2Service'

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
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Undo last action
    const result = await undoLastAction(user.id, assistant.id)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/undo:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
