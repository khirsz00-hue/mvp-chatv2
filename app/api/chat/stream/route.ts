import { NextRequest } from 'next/server'
import { addClient, removeClient } from './store'

// 🧠 KLUCZOWE: wyłącz statyczną analizę i wymuś runtime edge lub node
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const preferredRegion = 'auto'
export const revalidate = 0

export async function GET(req: NextRequest) {
  // 🚀 Tylko log, żeby Vercel wiedział że to aktywny stream
  console.log('📡 Nowe połączenie SSE /api/chat/stream')

  const stream = new ReadableStream({
    start(controller) {
      const id = Date.now()

      addClient((data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
      }, id)

      req.signal.addEventListener('abort', () => {
        removeClient(id)
        controller.close()
      })
    },
    cancel() {
      console.log('❌ Stream zamknięty')
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // 🚀 zapobiega buforowaniu (Nginx / Vercel Edge)
    },
  })
}
