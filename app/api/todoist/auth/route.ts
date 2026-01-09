import { NextResponse } from 'next/server'
import { parseUserAgent } from '@/lib/utils/networkUtils'

export const runtime = 'nodejs' // ✅ wymusza działanie w środowisku Node, gdzie działa process.env

export async function GET(req: Request) {
  // Log user agent for mobile diagnostics
  const userAgent = req.headers.get('user-agent') || ''
  const deviceInfo = parseUserAgent(userAgent)
  
  console.log('🔍 [Todoist Auth] OAuth initiation:', {
    isMobile: deviceInfo.isMobile,
    isWebview: deviceInfo.isWebview,
    platform: deviceInfo.platform
  })
  
  // Check for debug mode
  const { searchParams } = new URL(req.url)
  const debug = searchParams.get('debug') === '1'
  
  if (debug) {
    console.log('🐛 [Todoist Auth] Debug mode - Full user agent:', deviceInfo.details)
  }

  const clientId = process.env.TODOIST_CLIENT_ID
  const redirectUri = process.env.TODOIST_REDIRECT_URI
  const clientSecret = process.env.TODOIST_CLIENT_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL

  // 🧩 Pełny debug środowiska — pojawi się w logach Vercel
  console.log('🧩 [Todoist Auth] OAuth ENV check:', {
    TODOIST_CLIENT_ID: clientId ? '✅ set' : '❌ missing',
    TODOIST_CLIENT_SECRET: clientSecret ? '✅ set' : '❌ missing',
    TODOIST_REDIRECT_URI: redirectUri,
    NEXT_PUBLIC_SITE_URL: baseUrl,
  })

  // 🔴 Zabezpieczenie: jeśli coś brak
  if (!clientId || !redirectUri) {
    console.error('❌ [Todoist Auth] Missing OAuth config (clientId or redirectUri)')
    return NextResponse.json(
      { error: 'Brakuje konfiguracji OAuth Todoist. Sprawdź zmienne środowiskowe.' },
      { status: 500 }
    )
  }

  // 🔗 Budujemy URL autoryzacji
  const url = new URL('https://todoist.com/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', 'data:read_write')
  url.searchParams.set('state', 'todoist')
  url.searchParams.set('redirect_uri', redirectUri)

  console.log('🌐 [Todoist Auth] Redirecting to Todoist OAuth:', url.toString())

  return NextResponse.redirect(url.toString())
}
