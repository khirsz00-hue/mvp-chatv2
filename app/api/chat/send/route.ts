import { NextResponse } from 'next/server'
import { broadcastMessage } from '../chat/stream/store' // ✅ poprawna ścieżka

export async function POST(req: Request) {
  const { taskId, message, role } = await req.json()

  const payload = {
    taskId,
    message,
    role,
    timestamp: Date.now(),
  }

  broadcastMessage(payload)
  return NextResponse.json({ ok: true })
}
