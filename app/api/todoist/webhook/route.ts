import { NextResponse } from 'next/server'

let lastEventTime = 0

export async function POST(req: Request) {
  const body = await req.json()
  console.log('🔔 Webhook Todoist:', body.event_name)

  // zapamiętaj timestamp ostatniego eventu
  lastEventTime = Date.now()

  return NextResponse.json({ ok: true })
}

export async function GET() {
  // zwracamy timestamp ostatniego eventu (do porównania z frontem)
  return NextResponse.json({ lastEventTime })
}
