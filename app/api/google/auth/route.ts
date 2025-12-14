import { NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/googleCalendar'

/**
 * Initiate Google Calendar OAuth flow
 * Redirects user to Google's OAuth consent screen
 */

export const runtime = 'nodejs'

export async function GET() {
  try {
    const authUrl = GoogleCalendarService.getAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}
