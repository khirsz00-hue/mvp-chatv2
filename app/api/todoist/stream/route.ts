import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let lastTimestamp = 0

      const interval = setInterval(() => {
        const lastEvent = (globalThis as any).lastTodoistEvent

        if (lastEvent && lastEvent.ts > lastTimestamp) {
          lastTimestamp = lastEvent.ts

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(lastEvent)}\n\n`)
          )

          console.log('📡 [SSE] Wysłano event →', lastEvent.event)
        }
      }, 1000)

      // czyszczenie po zamknięciu połączenia
      const close = () => clearInterval(interval)
      ;(controller as any).close = close
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
