export async function GET() {
  return new Response(
    new ReadableStream({
      start(controller) {
        const send = (data: any) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        }

        send({ type: 'connected' })

        // 🔁 co 2 sekundy sprawdzamy, czy był nowy event
        let lastSent = 0
        const interval = setInterval(() => {
          const ev = (globalThis as any).lastTodoistEvent
          if (ev && ev.ts > lastSent) {
            send(ev)
            lastSent = ev.ts
          }
        }, 2000)

        controller.enqueue(`data: "listening"\n\n`)
        const stop = () => clearInterval(interval)
        controller.close = stop
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  )
}
