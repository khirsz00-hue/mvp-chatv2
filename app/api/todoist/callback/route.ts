import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Brak kodu autoryzacji' }, { status: 400 })
  }

  const tokenRes = await fetch('https://todoist.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.TODOIST_CLIENT_ID!,
      client_secret: process.env.TODOIST_CLIENT_SECRET!,
      code
    })
  })

  const data = await tokenRes.json()

  // 🔧 tu jest poprawka ↓ — musimy użyć pełnego adresu
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mvp-chatv2.vercel.app'
  return NextResponse.redirect(`${baseUrl}/?todoist_token=${data.access_token}`)
}
