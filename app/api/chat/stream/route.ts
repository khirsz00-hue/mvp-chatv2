import { NextRequest } from 'next/server'
import { addClient, removeClient } from './store'

export const dynamic = 'force-dynamic' // 🚀 zapobiega static generation timeout

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const id = Date.now()

      // 💾 Rejestracja klienta
      addClient((data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
      }, id)

      // 🧹 Usunięcie klienta po rozłączeniu
      req.signal.addEventListener('abort', () => {
        removeClient(id)
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
