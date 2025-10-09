export const dynamic = 'force-dynamic' // ⬅️ kluczowa linia!

import { registerClient } from '../todoistStream'

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const send = (msg: string) => controller.enqueue(encoder.encode(`data: ${msg}\n\n`))
      const res = {
        write: (chunk: string) => send(chunk),
        closed: false,
      }

      registerClient(res)
      send(JSON.stringify({ event: 'connected', ts: Date.now() }))
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
