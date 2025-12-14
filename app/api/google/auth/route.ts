import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs' // ✅ wymusza działanie w środowisku Node, gdzie działa process.env

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL

  // 🧩 Pełny debug środowiska — pojawi się w logach Vercel
  console.log('🧩 [DEBUG OAuth ENV]', {
    GOOGLE_CLIENT_ID: clientId ? '✅ set' : '❌ missing',
    GOOGLE_CLIENT_SECRET: clientSecret ? '✅ set' : '❌ missing',
    GOOGLE_REDIRECT_URI: redirectUri,
    NEXT_PUBLIC_SITE_URL: baseUrl,
    ENV_KEYS: Object.keys(process.env).filter(k =>
      k.startsWith('GOOGLE') || k.startsWith('NEXT_PUBLIC_SITE')
    ),
  })

  // 🔴 Zabezpieczenie: jeśli coś brak
  if (!clientId || !clientSecret || !redirectUri) {
    console.error('❌ Brak konfiguracji OAuth Google Calendar (clientId, clientSecret lub redirectUri)')
    return NextResponse.json(
      { error: 'Brakuje konfiguracji OAuth Google Calendar. Sprawdź zmienne środowiskowe.' },
      { status: 500 }
    )
  }

  // 🔗 Tworzenie klienta OAuth2
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  )

  // 🔗 Generowanie URL autoryzacji
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    state: 'google_calendar',
    prompt: 'consent'
  })

  console.log('🌐 Przekierowanie do Google OAuth:', authUrl)

  return NextResponse.redirect(authUrl)
}
