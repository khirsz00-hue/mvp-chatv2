// app/api/chat/send/route.ts
import { NextResponse } from 'next/server'
import { broadcastMessage } from '../stream/broadcast'

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
