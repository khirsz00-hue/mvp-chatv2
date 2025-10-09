import { NextResponse } from 'next/server'
import { broadcast } from '../todoistStream'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('📩 [TODOIST WEBHOOK]', body.event_name, body.event_data?.content)

    // Wyślij event do wszystkich aktywnych klientów SSE
    broadcast({
      event: body.event_name,
      data: body.event_data || {},
      ts: Date.now(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ Błąd webhooka Todoist:', err)
    return NextResponse.json({ error: 'Błąd webhooka' }, { status: 500 })
  }
}
