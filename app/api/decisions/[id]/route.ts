// API Route: /api/decisions/[id]
// Handles individual decision operations (GET, PUT, DELETE)
import { NextRequest, NextResponse } from 'next/server'
import {
  getDecisionById,
  updateDecision,
  deleteDecision,
} from '@/lib/services/decisionService'

interface RouteContext {
  params: {
    id: string
  }
}

// GET /api/decisions/[id] - Get a single decision with options and events
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = params

    const decision = await getDecisionById(id)

    if (!decision) {
      return NextResponse.json(
        { error: 'Decision not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ decision })
  } catch (error) {
    console.error('Error in GET /api/decisions/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to fetch decision' },
      { status: 500 }
    )
  }
}

// PUT /api/decisions/[id] - Update a decision
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = params
    const body = await request.json()

    const decision = await updateDecision(id, body)

    if (!decision) {
      return NextResponse.json(
        { error: 'Failed to update decision' },
        { status: 500 }
      )
    }

    return NextResponse.json({ decision })
  } catch (error) {
    console.error('Error in PUT /api/decisions/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to update decision' },
      { status: 500 }
    )
  }
}

// DELETE /api/decisions/[id] - Delete a decision
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = params

    const success = await deleteDecision(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete decision' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/decisions/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to delete decision' },
      { status: 500 }
    )
  }
}
