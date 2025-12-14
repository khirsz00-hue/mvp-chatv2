// Types for Google Calendar Integration

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{ email: string }>
}

export interface GoogleCalendarTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
}

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}
