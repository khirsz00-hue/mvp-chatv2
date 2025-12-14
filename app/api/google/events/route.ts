import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleCalendarService } from '@/lib/googleCalendar'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

/**
 * Get user from authorization header
 */
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' }
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
    return { user: null, error: 'Unauthorized' }
  }

  return { user, error: null }
}

/**
 * Handle Google API errors with appropriate responses
 */
function handleGoogleApiError(error: any): NextResponse {
  console.error('Google API error:', error)
  
  // Handle specific Google API errors
  if (error.code === 401 || error.code === 403) {
    return NextResponse.json(
      { error: 'Token expired or invalid. Please reconnect your Google Calendar.' },
      { status: 401 }
    )
  }

  return NextResponse.json(
    { error: error.message || 'Google Calendar API error' },
    { status: 500 }
  )
}

/**
 * GET - List upcoming events from user's Google Calendar
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req)
    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    // Get max results from query params (default 10)
    const { searchParams } = new URL(req.url)
    const maxResults = parseInt(searchParams.get('maxResults') || '10', 10)

    // Create calendar service for user
    const service = await GoogleCalendarService.forUser(user.id)

    if (!service) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 404 }
      )
    }

    // List events
    const events = await service.listEvents(maxResults)

    return NextResponse.json({ events })
  } catch (error: any) {
    return handleGoogleApiError(error)
  }
}

/**
 * POST - Create a new event in user's Google Calendar
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req)
    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { summary, description, start, end, attendees, reminders } = body

    // Validate required fields
    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields: summary, start, end' },
        { status: 400 }
      )
    }

    // Validate date format
    if (!start.dateTime || !end.dateTime) {
      return NextResponse.json(
        { error: 'start and end must include dateTime' },
        { status: 400 }
      )
    }

    // Create calendar service for user
    const service = await GoogleCalendarService.forUser(user.id)

    if (!service) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 404 }
      )
    }

    // Create event
    const event = await service.createEvent({
      summary,
      description,
      start,
      end,
      attendees,
      reminders
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error: any) {
    return handleGoogleApiError(error)
  }
}
