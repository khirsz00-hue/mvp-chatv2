import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Brak kodu autoryzacji' }, { status: 400 })
  }

  const clientId = process.env.TODOIST_CLIENT_ID
  const clientSecret = process.env.TODOIST_CLIENT_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mvp-chatv2.vercel.app'

  if (!clientId || !clientSecret) {
    console.error('❌ Brak danych OAuth Todoist (client_id / secret)')
    return NextResponse.json(
      { error: 'Brakuje konfiguracji OAuth Todoist. Sprawdź zmienne środowiskowe.' },
      { status: 500 }
    )
  }

  try {
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
    console.log('🔑 Otrzymano token Todoist:', data)

    if (!data.access_token) {
      throw new Error(JSON.stringify(data))
    }

    return NextResponse.redirect(`${baseUrl}/?todoist_token=${data.access_token}`)
  } catch (err) {
    console.error('⚠️ Błąd podczas wymiany kodu OAuth:', err)
    return NextResponse.json({ error: 'Nie udało się uzyskać tokena.' }, { status: 500 })
  }
}
