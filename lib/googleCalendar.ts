import { google, calendar_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client
  private calendar: calendar_v3.Calendar
  private userId: string

  constructor(userId: string, accessToken: string, refreshToken: string, expiryDate: number) {
    this.userId = userId
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate
    })

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  /**
   * Create a GoogleCalendarService instance for a specific user
   * Loads tokens from database and handles token refresh if needed
   */
  static async forUser(userId: string): Promise<GoogleCalendarService | null> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's Google tokens from database
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      console.error('Error fetching user profile:', error)
      return null
    }

    // Check if user has connected Google Calendar
    if (!profile.google_access_token || !profile.google_refresh_token) {
      return null
    }

    const service = new GoogleCalendarService(
      userId,
      profile.google_access_token,
      profile.google_refresh_token,
      profile.google_token_expiry
    )

    // Check if token is expired
    const now = Date.now()
    if (profile.google_token_expiry && profile.google_token_expiry < now) {
      console.log('Token expired, refreshing...')
      await service.refreshAccessToken()
    }

    return service
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      // Update credentials in oauth2Client
      this.oauth2Client.setCredentials(credentials)

      // Save new token to database
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { error } = await supabase
        .from('user_profiles')
        .update({
          google_access_token: credentials.access_token,
          google_token_expiry: credentials.expiry_date
        })
        .eq('id', this.userId)

      if (error) {
        console.error('Error updating tokens in database:', error)
        throw new Error('Failed to update tokens')
      }

      console.log('Token refreshed successfully')
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw error
    }
  }

  /**
   * Generic retry wrapper for calendar API calls
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error: any) {
      // If token is invalid, try refreshing and retry once
      if (error.code === 401 || error.code === 403) {
        await this.refreshAccessToken()
        return await operation()
      }
      throw error
    }
  }

  /**
   * List events from user's primary calendar
   */
  async listEvents(maxResults: number = 10): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      })
      return response.data.items || []
    })
  }

  /**
   * Create a new event in user's primary calendar
   */
  async createEvent(eventData: {
    summary: string
    description?: string
    start: { dateTime: string; timeZone?: string }
    end: { dateTime: string; timeZone?: string }
    attendees?: { email: string }[]
    reminders?: {
      useDefault: boolean
      overrides?: { method: string; minutes: number }[]
    }
  }): Promise<any> {
    return this.executeWithRetry(async () => {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData,
      })
      return response.data
    })
  }

  /**
   * Delete an event from user's primary calendar
   */
  async deleteEvent(eventId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      })
    })
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ]

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
    })
  }
}
