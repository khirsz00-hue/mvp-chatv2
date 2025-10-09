import { NextResponse } from 'next/server'

// 🧠 Tu możesz dodać np. prostą walidację tokena z URL-a, jeśli chcesz
export async function POST(req: Request) {
  const body = await req.json()
  console.log('📩 [TODOIST WEBHOOK]', body?.event_name, body?.event_data?.content)

  // 🔊 Emitujemy event do "globalnego kanału" w pamięci serwera
  globalThis.lastTodoistEvent = {
    event: body.event_name,
    id: body.event_data?.id,
    ts: Date.now(),
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
