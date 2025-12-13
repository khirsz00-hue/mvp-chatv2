// API Route: /api/decisions
// Handles listing and creating decisions
import { NextRequest, NextResponse } from 'next/server'
import { createDecision, getUserDecisions } from '@/lib/services/decisionService'

// GET /api/decisions - List all decisions for the user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const decisions = await getUserDecisions(userId, includeArchived)

    return NextResponse.json({ decisions })
  } catch (error) {
    console.error('Error in GET /api/decisions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch decisions' },
      { status: 500 }
    )
  }
}

// POST /api/decisions - Create a new decision
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, description, context } = body

    if (!userId || !title) {
      return NextResponse.json(
        { error: 'userId and title are required' },
        { status: 400 }
      )
    }

    const decision = await createDecision(userId, {
      title,
      description,
      context,
    })

    if (!decision) {
      return NextResponse.json(
        { error: 'Failed to create decision' },
        { status: 500 }
      )
    }

    return NextResponse.json({ decision }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/decisions:', error)
    return NextResponse.json(
      { error: 'Failed to create decision' },
      { status: 500 }
    )
  }
}
