import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { fetchWithRetry, parseUserAgent } from '@/lib/utils/networkUtils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const debug = searchParams.get('debug') === '1'

  // Log user agent for mobile diagnostics
  const userAgent = req.headers.get('user-agent') || ''
  const deviceInfo = parseUserAgent(userAgent)
  
  console.log('🔍 [Todoist Callback] Request details:', {
    isMobile: deviceInfo.isMobile,
    isWebview: deviceInfo.isWebview,
    platform: deviceInfo.platform,
    debug
  })
  
  if (debug) {
    console.log('🐛 [Todoist Callback] Debug mode - User agent:', deviceInfo.details)
  }

  if (!code) {
    console.error('❌ [Todoist Callback] No authorization code provided')
    return NextResponse.json({ error: 'Brak kodu autoryzacji' }, { status: 400 })
  }

  const clientId = process.env.TODOIST_CLIENT_ID
  const clientSecret = process.env.TODOIST_CLIENT_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mvp-chatv2.vercel.app'

  if (!clientId || !clientSecret) {
    console.error('❌ [Todoist Callback] Missing OAuth config (client_id / secret)')
    return NextResponse.json(
      { error: 'Brakuje konfiguracji OAuth Todoist. Sprawdź zmienne środowiskowe.' },
      { status: 500 }
    )
  }

  try {
    // Get authenticated user
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      console.error('❌ [Todoist Callback] No authenticated user')
      return NextResponse.redirect(`${baseUrl}/login?error=not_authenticated`)
    }

    console.log(`✅ [Todoist Callback] Authenticated user: ${user.id}`)

    // Exchange code for token with retry
    console.log('🔄 [Todoist Callback] Exchanging code for access token')
    const tokenRes = await fetchWithRetry('https://todoist.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error('❌ [Todoist Callback] Token exchange failed:', tokenRes.status, errorText)
      throw new Error(`Token exchange failed with status ${tokenRes.status}`)
    }

    const data = await tokenRes.json()
    console.log('✅ [Todoist Callback] Token received')

    if (!data.access_token) {
      console.error('❌ [Todoist Callback] No access_token in response:', JSON.stringify(data))
      throw new Error('No access token in response')
    }

    // Try to fetch Todoist user info using Sync API (more reliable than REST v2)
    console.log('🔍 [Todoist Callback] Fetching Todoist user info via Sync API')
    let todoistUserId: string | null = null
    
    try {
      // Use Sync API v9 which is more reliable than REST v2
      const syncRes = await fetchWithRetry('https://api.todoist.com/sync/v9/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sync_token: '*',
          resource_types: ['user']
        })
      })

      if (syncRes.ok) {
        const syncData = await syncRes.json()
        if (syncData.user && syncData.user.id) {
          todoistUserId = syncData.user.id.toString()
          console.log('✅ [Todoist Callback] Got user ID from Sync API:', todoistUserId)
        } else {
          console.warn('⚠️ [Todoist Callback] Sync API response missing user.id')
        }
      } else {
        console.warn('⚠️ [Todoist Callback] Sync API request failed:', syncRes.status)
        
        // Fallback: Try REST API v2 as backup
        console.log('🔄 [Todoist Callback] Trying REST API v2 as fallback')
        const restRes = await fetchWithRetry('https://api.todoist.com/rest/v2/users/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        })
        
        if (restRes.ok) {
          const restUser = await restRes.json()
          if (restUser.id) {
            todoistUserId = restUser.id.toString()
            console.log('✅ [Todoist Callback] Got user ID from REST API fallback:', todoistUserId)
          }
        } else {
          console.warn('⚠️ [Todoist Callback] REST API fallback also failed:', restRes.status)
        }
      }
    } catch (userInfoError) {
      console.warn('⚠️ [Todoist Callback] Failed to fetch user info:', userInfoError)
      // Continue anyway - we'll save the token without user_id
    }

    // Save token to database (with or without user_id)
    // Even if we couldn't get user_id, the token is still useful
    const updateData: { todoist_token: string; todoist_user_id?: string } = {
      todoist_token: data.access_token
    }
    
    if (todoistUserId) {
      updateData.todoist_user_id = todoistUserId
    }

    console.log('💾 [Todoist Callback] Saving to database:', {
      hasToken: true,
      hasUserId: !!todoistUserId
    })

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ [Todoist Callback] Failed to save to DB:', updateError.message)
      throw updateError
    }

    console.log('✅ [Todoist Callback] Successfully saved to database for user:', user.id)

    // Redirect with success indicator
    const redirectUrl = `${baseUrl}/?todoist_connected=true`
    console.log('🎉 [Todoist Callback] OAuth flow completed, redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
    
  } catch (err) {
    console.error('❌ [Todoist Callback] Error during OAuth exchange:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ [Todoist Callback] Error details:', errorMessage)
    return NextResponse.redirect(`${baseUrl}/?error=todoist_connection_failed&details=${encodeURIComponent(errorMessage)}`)
  }
}
