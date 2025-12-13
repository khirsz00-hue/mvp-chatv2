import { NextResponse } from 'next/server'
import { DecisionService } from '@/src/features/decision-assistant/services/decisionService'

// POST /api/decision/create - Create a new decision
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, title, description, options } = body

    if (!userId || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, description' },
        { status: 400 }
      )
    }

    const decision = await DecisionService.createDecision(
      userId,
      title,
      description,
      options
    )

    return NextResponse.json({ decision }, { status: 201 })
  } catch (err: any) {
    console.error('Error in /api/decision/create:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
