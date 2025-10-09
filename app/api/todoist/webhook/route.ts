import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json()

  console.log('📩 [TODOIST WEBHOOK]', body?.event_name, body?.event_data?.content)

  // 🔊 Zapisz event do pamięci serwera (globalnej)
  ;(globalThis as any).lastTodoistEvent = {
    event: body.event_name,
    data: body.event_data,
    ts: Date.now(),
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
