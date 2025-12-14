import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Check Google Calendar connection status for authenticated user
 * Returns whether user has connected their Google Calendar and token expiry
 */
export async function GET(req: NextRequest) {
  try {
    // Get user from session
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Google Calendar connection status
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('google_access_token, google_token_expiry')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { error: 'Failed to fetch connection status' },
        { status: 500 }
      )
    }

    const connected = !!(profile?.google_access_token)
    const expiry = profile?.google_token_expiry || null

    return NextResponse.json({
      connected,
      expiry,
      isExpired: expiry ? expiry < Date.now() : null
    })
  } catch (error: any) {
    console.error('Error in /api/google/status:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
