import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // 🔴 Obsługa błędu z Google OAuth
  if (error) {
    console.error('❌ Google OAuth error:', error)
    return NextResponse.json(
      { error: `Google OAuth error: ${error}` },
      { status: 400 }
    )
  }

  // 🔴 Brak kodu autoryzacji
  if (!code) {
    return NextResponse.json({ error: 'Brak kodu autoryzacji' }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mvp-chatv2.vercel.app'

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('❌ Brak danych OAuth Google Calendar (client_id / secret / redirect_uri)')
    return NextResponse.json(
      { error: 'Brakuje konfiguracji OAuth Google Calendar. Sprawdź zmienne środowiskowe.' },
      { status: 500 }
    )
  }

  try {
    // 🔑 Tworzenie klienta OAuth2
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // 🔑 Wymiana kodu na tokeny
    const { tokens } = await oauth2Client.getToken(code)

    console.log('🔑 Otrzymano tokeny Google Calendar:', {
      access_token: tokens.access_token ? '✅ present' : '❌ missing',
      refresh_token: tokens.refresh_token ? '✅ present' : '❌ missing',
      expiry_date: tokens.expiry_date
    })

    if (!tokens.access_token) {
      throw new Error('Brak access_token w odpowiedzi')
    }

    // 🔗 Budowanie parametrów przekierowania
    const redirectUrl = new URL(baseUrl)
    redirectUrl.searchParams.set('google_access_token', tokens.access_token)
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set('google_refresh_token', tokens.refresh_token)
    }
    if (tokens.expiry_date) {
      redirectUrl.searchParams.set('google_token_expiry', tokens.expiry_date.toString())
    }

    console.log('✅ Przekierowanie do:', redirectUrl.toString())

    return NextResponse.redirect(redirectUrl.toString())
  } catch (err) {
    console.error('⚠️ Błąd podczas wymiany kodu OAuth:', err)
    return NextResponse.json(
      { error: 'Nie udało się uzyskać tokena.' },
      { status: 500 }
    )
  }
}
