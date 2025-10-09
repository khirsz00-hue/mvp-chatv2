import { NextResponse } from 'next/server'

let clients: any[] = []

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('📩 [TODOIST WEBHOOK]', body.event_name, body.event_data?.content)

    // Powiadom wszystkich klientów SSE
    const payload = {
      event: body.event_name,
      data: body.event_data || {},
      ts: Date.now(),
    }

    clients.forEach((res) => res.write(`data: ${JSON.stringify(payload)}\n\n`))
    clients = clients.filter((res) => !res.closed)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ Błąd webhooka Todoist:', err)
    return NextResponse.json({ error: 'Błąd webhooka' }, { status: 500 })
  }
}

// używane przez /api/todoist/stream do rejestracji klientów
export function registerClient(res: any) {
  clients.push(res)
}
