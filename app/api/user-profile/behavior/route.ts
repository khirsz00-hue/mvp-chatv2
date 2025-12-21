/**
 * API Route: /api/user-profile/behavior
 * GET: Fetch user behavior profile
 * POST: Update user behavior profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch behavior profile
    const { data: profile, error } = await supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile exists - return default
        return NextResponse.json({
          user_id: user.id,
          peak_productivity_start: 9,
          peak_productivity_end: 12,
          preferred_task_duration: 30,
          context_switch_sensitivity: 0.5,
          postpone_patterns: {},
          energy_patterns: [],
          completion_streaks: [],
          updated_at: new Date().toISOString()
        })
      }
      throw error
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('[API] Error fetching behavior profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch behavior profile' },
      { status: 500 }
    )
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

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      peak_productivity_start,
      peak_productivity_end,
      preferred_task_duration,
      context_switch_sensitivity,
      postpone_patterns,
      energy_patterns,
      completion_streaks
    } = body

    // Validate numeric fields
    if (peak_productivity_start !== undefined && 
        (peak_productivity_start < 0 || peak_productivity_start > 23)) {
      return NextResponse.json(
        { error: 'peak_productivity_start must be between 0-23' },
        { status: 400 }
      )
    }

    if (peak_productivity_end !== undefined && 
        (peak_productivity_end < 0 || peak_productivity_end > 23)) {
      return NextResponse.json(
        { error: 'peak_productivity_end must be between 0-23' },
        { status: 400 }
      )
    }

    if (context_switch_sensitivity !== undefined && 
        (context_switch_sensitivity < 0 || context_switch_sensitivity > 1)) {
      return NextResponse.json(
        { error: 'context_switch_sensitivity must be between 0-1' },
        { status: 400 }
      )
    }

    // Upsert behavior profile
    const { data: profile, error } = await supabase
      .from('user_behavior_profiles')
      .upsert({
        user_id: user.id,
        ...(peak_productivity_start !== undefined && { peak_productivity_start }),
        ...(peak_productivity_end !== undefined && { peak_productivity_end }),
        ...(preferred_task_duration !== undefined && { preferred_task_duration }),
        ...(context_switch_sensitivity !== undefined && { context_switch_sensitivity }),
        ...(postpone_patterns !== undefined && { postpone_patterns }),
        ...(energy_patterns !== undefined && { energy_patterns }),
        ...(completion_streaks !== undefined && { completion_streaks }),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('[API] Error updating behavior profile:', error)
    return NextResponse.json(
      { error: 'Failed to update behavior profile' },
      { status: 500 }
    )
  }
}
