import { NextResponse } from 'next/server'
import { DecisionService } from '@/src/features/decision-assistant/services/decisionService'

// GET /api/decision/[id] - Get a specific decision with options
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { decision, options } = await DecisionService.getDecision(id)

    return NextResponse.json({ decision, options })
  } catch (err: any) {
    console.error('Error in /api/decision/[id] GET:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/decision/[id] - Update a decision
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updates = await req.json()

    const decision = await DecisionService.updateDecision(id, updates)

    return NextResponse.json({ decision })
  } catch (err: any) {
    console.error('Error in /api/decision/[id] PUT:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/decision/[id] - Delete a decision
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await DecisionService.deleteDecision(id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in /api/decision/[id] DELETE:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
