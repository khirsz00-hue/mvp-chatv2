import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic' // 🧠 kluczowe: wyłącza statyczne generowanie

let clients: any[] = []

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const client = {
        id: Date.now(),
        send: (data: any) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        },
      }
      clients.push(client)

      req.signal.addEventListener('abort', () => {
        clients = clients.filter((c) => c.id !== client.id)
        controller.close()
      })
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
