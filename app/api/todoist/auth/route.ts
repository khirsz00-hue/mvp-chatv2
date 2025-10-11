import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.TODOIST_CLIENT_ID
  const redirectUri = process.env.TODOIST_REDIRECT_URI

  if (!clientId || !redirectUri) {
    console.error('❌ Brak konfiguracji OAuth Todoist')
    return NextResponse.json(
      { error: 'Brakuje konfiguracji OAuth Todoist. Sprawdź zmienne środowiskowe.' },
      { status: 500 }
    )
  }

  const url = new URL('https://todoist.com/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', 'data:read_write')
  url.searchParams.set('state', 'todoist')
  url.searchParams.set('redirect_uri', redirectUri)

  console.log('🌐 Przekierowanie do Todoist OAuth:', url.toString())
  return NextResponse.redirect(url.toString())
}
