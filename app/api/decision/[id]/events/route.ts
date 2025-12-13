import { NextResponse } from 'next/server'
import { DecisionService } from '@/src/features/decision-assistant/services/decisionService'

// GET /api/decision/[id]/events - Get all events for a decision
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(req.url)
    const hatColor = searchParams.get('hatColor')

    let events
    if (hatColor) {
      events = await DecisionService.getEventsByHat(id, hatColor as any)
    } else {
      events = await DecisionService.getEvents(id)
    }

    return NextResponse.json({ events })
  } catch (err: any) {
    console.error('Error in /api/decision/[id]/events:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
