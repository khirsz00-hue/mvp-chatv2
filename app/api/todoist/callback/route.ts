import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Brak kodu autoryzacji' }, { status: 400 })
  }

  const clientId = process.env.TODOIST_CLIENT_ID
  const clientSecret = process.env.TODOIST_CLIENT_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mvp-chatv2.vercel.app'

  if (!clientId || !clientSecret) {
    console.error('❌ Brak danych OAuth Todoist (client_id / secret)')
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
      console.error('[Todoist Callback] ✗ No authenticated user')
      return NextResponse.redirect(`${baseUrl}/login?error=not_authenticated`)
    }

    console.log(`[Todoist Callback] ✓ Authenticated user: ${user.id}`)

    // Exchange code for token
    const tokenRes = await fetch('https://todoist.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    const data = await tokenRes.json()
    console.log('[Todoist Callback] 🔑 Token received')

    if (!data.access_token) {
      throw new Error(JSON.stringify(data))
    }

    // Fetch Todoist user info to get user_id
    console.log('[Todoist Callback] 🔍 Fetching Todoist user info')
    const userInfoRes = await fetch('https://api.todoist.com/rest/v2/users/me', {
      headers: {
        Authorization: `Bearer ${data.access_token}`
      }
    })

    if (!userInfoRes.ok) {
      console.error('[Todoist Callback] ❌ Failed to fetch Todoist user info:', userInfoRes.status)
      throw new Error(`Failed to fetch Todoist user info: ${userInfoRes.status}`)
    }

    const todoistUser = await userInfoRes.json()
    const todoistUserId = todoistUser.id?.toString()

    if (!todoistUserId) {
      console.error('[Todoist Callback] ❌ No user ID in Todoist response')
      throw new Error('No user ID in Todoist response')
    }

    console.log('[Todoist Callback] ✅ Todoist user ID:', todoistUserId)

    // Save token and user_id to database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        todoist_token: data.access_token,
        todoist_user_id: todoistUserId
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Todoist Callback] ✗ Failed to save token to DB:', updateError.message)
      throw updateError
    }

    console.log('[Todoist Callback] ✓ Token and user ID saved to database for user:', user.id)

    // Redirect with success indicator
    return NextResponse.redirect(`${baseUrl}/?todoist_connected=true`)
  } catch (err) {
    console.error('[Todoist Callback] ⚠️ Error during OAuth exchange:', err)
    return NextResponse.redirect(`${baseUrl}/?error=todoist_connection_failed`)
  }
}
