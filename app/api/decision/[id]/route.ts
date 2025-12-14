import { NextResponse } from 'next/server'
import { DecisionService } from '@/src/features/decision-assistant/services/decisionService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await DecisionService.getDecision(params.id)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error in /api/decision/[id]:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to get decision' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await DecisionService.deleteDecision(params.id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in /api/decision/[id] DELETE:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to delete decision' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const decision = await DecisionService.updateDecision(params.id, body)
    return NextResponse.json({ decision })
  } catch (err: any) {
    console.error('Error in /api/decision/[id] PATCH:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to update decision' },
      { status: 500 }
    )
  }
}
