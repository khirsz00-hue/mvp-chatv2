/**
 * API Route: /api/day-assistant-v2/config
 * POST: Save work hours configuration and AI instructions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      work_start_time, 
      work_end_time, 
      ai_instructions,
      plan_date
    } = body

    // Validate required fields
    if (!work_start_time || !work_end_time) {
      return NextResponse.json(
        { error: 'work_start_time and work_end_time are required' },
        { status: 400 }
      )
    }

    // Get assistant
    const { data: assistant } = await supabase
      .from('assistant_config')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'asystent dnia v2')
      .single()

    if (!assistant) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      )
    }

    const today = plan_date || new Date().toISOString().split('T')[0]

    // Get existing plan
    const { data: existingPlan } = await supabase
      .from('day_assistant_v2_plan')
      .select('*')
      .eq('user_id', user.id)
      .eq('assistant_id', assistant.id)
      .eq('plan_date', today)
      .single()

    // Merge metadata
    const metadata = {
      ...(existingPlan?.metadata || {}),
      work_start_time,
      work_end_time,
      ai_instructions: ai_instructions || null
    }

    // Upsert plan with updated metadata
    const { data: updatedPlan, error: upsertError } = await supabase
      .from('day_assistant_v2_plan')
      .upsert({
        user_id: user.id,
        assistant_id: assistant.id,
        plan_date: today,
        energy: existingPlan?.energy || 3,
        focus: existingPlan?.focus || 3,
        blocks: existingPlan?.blocks || [],
        metadata
      }, {
        onConflict: 'user_id,assistant_id,plan_date'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[Config] Error upserting plan:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      dayPlan: updatedPlan,
      message: 'Konfiguracja zapisana'
    })

  } catch (error) {
    console.error('[Config] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
