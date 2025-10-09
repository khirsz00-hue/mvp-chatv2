import { NextRequest } from 'next/server'
import { addClient, removeClient } from './store'

// 🔁 Główna trasa SSE
export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const client = {
        id: Date.now(),
        send: (data: any) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        },
      }

      addClient(client)

      req.signal.addEventListener('abort', () => {
        removeClient(client.id)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
