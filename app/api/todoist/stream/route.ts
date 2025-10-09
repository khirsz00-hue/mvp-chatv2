import { NextResponse } from 'next/server'

// ⛔️ SSR/Static Export off
export const dynamic = 'force-dynamic'

export async function GET() {
  // 🔁 Utwórz strumień SSE (Server-Sent Events)
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // natychmiast wyślij sygnał, że połączenie działa
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'connected' })}\n\n`))

      // co 3s sprawdzaj, czy pojawił się nowy event
      const interval = setInterval(() => {
        const lastEvent = (globalThis as any).lastTodoistEvent
        if (lastEvent) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(lastEvent)}\n\n`))
          delete (globalThis as any).lastTodoistEvent // wyczyść po wysłaniu
        }
      }, 3000)

      // 🔒 zamknij połączenie po 60s, jeśli klient nie odświeży
      setTimeout(() => {
        clearInterval(interval)
        controller.close()
      }, 60000)
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
