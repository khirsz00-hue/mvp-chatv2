import { NextResponse } from 'next/server'

export const runtime = 'nodejs' // ✅ wymusza działanie w środowisku Node, gdzie działa process.env

export async function GET() {
  const clientId = process.env.TODOIST_CLIENT_ID
  const redirectUri = process.env.TODOIST_REDIRECT_URI
  const clientSecret = process.env.TODOIST_CLIENT_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL

  // 🧩 Pełny debug środowiska — pojawi się w logach Vercel
  console.log('🧩 [DEBUG OAuth ENV]', {
    TODOIST_CLIENT_ID: clientId ? '✅ set' : '❌ missing',
    TODOIST_CLIENT_SECRET: clientSecret ? '✅ set' : '❌ missing',
    TODOIST_REDIRECT_URI: redirectUri,
    NEXT_PUBLIC_APP_URL: baseUrl,
    ENV_KEYS: Object.keys(process.env).filter(k =>
      k.startsWith('TODOIST') || k.startsWith('NEXT_PUBLIC_APP')
    ),
  })

  // 🔴 Zabezpieczenie: jeśli coś brak
  if (!clientId || !redirectUri) {
    console.error('❌ Brak konfiguracji OAuth Todoist (clientId lub redirectUri)')
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

  console.log('🌐 Przekierowanie do Todoist OAuth:', url.toString())

  return NextResponse.redirect(url.toString())
}
