import { NextResponse } from 'next/server'
import { broadcastMessage } from './stream/route'

export async function POST(req: Request) {
  const { taskId, message, role } = await req.json()

  // opcjonalnie: tu można dodać zapis do bazy, Supabase itp.
  const msg = { taskId, message, role, timestamp: Date.now() }

  broadcastMessage(msg)
  return NextResponse.json({ success: true })
}
