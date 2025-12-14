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
