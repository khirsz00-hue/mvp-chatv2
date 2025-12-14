import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Handle Google OAuth callback
 * Exchanges authorization code for tokens and stores them securely in database
 */

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/?google_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?google_error=no_code`)
  }

  try {
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens')
    }

    console.log('Tokens obtained successfully (not showing full tokens for security)')

    // Get user session from cookie
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Find Supabase auth token cookies
    const authCookies = allCookies.filter(cookie => 
      cookie.name.includes('sb-') && cookie.name.includes('auth-token')
    )

    if (authCookies.length === 0) {
      console.error('No auth cookies found - user not logged in')
      return NextResponse.redirect(`${baseUrl}/login?google_error=not_logged_in`)
    }

    // Create Supabase client with the auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Try to get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.redirect(`${baseUrl}/login?google_error=auth_failed`)
    }

    console.log('User authenticated:', user.id)

    // Save tokens to database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: tokens.expiry_date
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error saving tokens to database:', updateError)
      return NextResponse.redirect(`${baseUrl}/?google_error=save_failed`)
    }

    console.log('Tokens saved successfully for user:', user.id)

    // Redirect to success page
    return NextResponse.redirect(`${baseUrl}/?google_connected=true`)

  } catch (error: any) {
    console.error('Error in Google callback:', error)
    return NextResponse.redirect(
      `${baseUrl}/?google_error=${encodeURIComponent(error.message || 'unknown')}`

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
