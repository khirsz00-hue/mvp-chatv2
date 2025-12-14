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

import { google } from 'googleapis'
import { CalendarEvent } from '@/types/googleCalendar'

// Klasa serwisu Google Calendar
export class GoogleCalendarService {
  private oauth2Client: any
  private calendar: any

  constructor(accessToken: string, refreshToken?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    // Inicjalizacja klienta OAuth2
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // Ustawienie credentials
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    // Inicjalizacja Calendar API
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
   * Lista nadchodzących eventów z kalendarza
   * @param maxResults - maksymalna liczba eventów do zwrócenia (domyślnie 10)
   */
  async listEvents(maxResults: number = 10) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      })

      return response.data.items || []
    } catch (error) {
      console.error('❌ Błąd podczas pobierania eventów:', error)
      throw error
    }
  }

  /**
   * Tworzenie nowego eventu w kalendarzu
   * @param event - obiekt CalendarEvent z danymi eventu
   */
  async createEvent(event: CalendarEvent) {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      })

      console.log('✅ Utworzono event:', response.data.id)
      return response.data
    } catch (error) {
      console.error('❌ Błąd podczas tworzenia eventu:', error)
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
   * Aktualizacja istniejącego eventu
   * @param eventId - ID eventu do zaktualizowania
   * @param event - częściowy obiekt CalendarEvent z nowymi danymi
   */
  async updateEvent(eventId: string, event: Partial<CalendarEvent>) {
    try {
      const response = await this.calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: event
      })

      console.log('✅ Zaktualizowano event:', eventId)
      return response.data
    } catch (error) {
      console.error('❌ Błąd podczas aktualizacji eventu:', error)
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
   * Usunięcie eventu z kalendarza
   * @param eventId - ID eventu do usunięcia
   */
  async deleteEvent(eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId
      })

      console.log('✅ Usunięto event:', eventId)
    } catch (error) {
      console.error('❌ Błąd podczas usuwania eventu:', error)
      throw error
    }
  }
}
