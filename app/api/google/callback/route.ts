import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'

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

    // Create Supabase client with authenticated session from cookies
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
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
    )
  }
}
