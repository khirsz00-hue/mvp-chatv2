import { NextResponse } from 'next/server'

// 🫀 Endpoint utrzymujący połączenie SSE przy życiu
export async function GET() {
  return NextResponse.json({ ok: true, ping: Date.now() })
}
