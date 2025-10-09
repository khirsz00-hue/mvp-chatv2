import { NextResponse } from 'next/server'
import { broadcastMessage } from '../stream/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function POST(req: Request) {
  const { taskId, message, role } = await req.json()

  // 🔊 Wyślij wiadomość do wszystkich połączonych klientów
  broadcastMessage({
    type: 'chat_message',
    taskId,
    message,
    role,
    timestamp: Date.now(),
  })

  return NextResponse.json({ ok: true })
}
