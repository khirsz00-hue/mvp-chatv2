import { NextResponse } from 'next/server'
import { DecisionService } from '@/src/features/decision-assistant/services/decisionService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const events = await DecisionService.getEvents(params.id)
    return NextResponse.json({ events })
  } catch (err: any) {
    console.error('Error in /api/decision/[id]/events:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to get events' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { hatColor, eventType, content, aiResponse } = body

    if (!hatColor || !eventType || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await DecisionService.addEvent(
      params.id,
      hatColor,
      eventType,
      content,
      aiResponse
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in /api/decision/[id]/events POST:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to add event' },
      { status: 500 }
    )
  }
}
