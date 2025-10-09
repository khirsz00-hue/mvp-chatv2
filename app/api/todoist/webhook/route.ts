import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  console.log('📩 [TODOIST WEBHOOK]', body?.event_name, body?.event_data?.content)

  // 🔊 Emitujemy event do "globalnego kanału" w pamięci serwera
  ;(globalThis as any).lastTodoistEvent = {
    event: body.event_name,
    id: body.event_data?.id,
    ts: Date.now(),
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
