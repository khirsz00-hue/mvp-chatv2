// API Route: /api/decisions/options
// Handles creating and managing decision options
import { NextRequest, NextResponse } from 'next/server'
import {
  addDecisionOption,
  updateDecisionOption,
  deleteDecisionOption,
} from '@/lib/services/decisionService'

// POST /api/decisions/options - Add a new option to a decision
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { decision_id, label, description, pros, cons } = body

    if (!decision_id || !label) {
      return NextResponse.json(
        { error: 'decision_id and label are required' },
        { status: 400 }
      )
    }

    const option = await addDecisionOption({
      decision_id,
      label,
      description,
      pros,
      cons,
    })

    if (!option) {
      return NextResponse.json(
        { error: 'Failed to create option' },
        { status: 500 }
      )
    }

    return NextResponse.json({ option }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/decisions/options:', error)
    return NextResponse.json(
      { error: 'Failed to create option' },
      { status: 500 }
    )
  }
}

// PUT /api/decisions/options - Update an option
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const option = await updateDecisionOption(id, updates)

    if (!option) {
      return NextResponse.json(
        { error: 'Failed to update option' },
        { status: 500 }
      )
    }

    return NextResponse.json({ option })
  } catch (error) {
    console.error('Error in PUT /api/decisions/options:', error)
    return NextResponse.json(
      { error: 'Failed to update option' },
      { status: 500 }
    )
  }
}

// DELETE /api/decisions/options - Delete an option
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const success = await deleteDecisionOption(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete option' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/decisions/options:', error)
    return NextResponse.json(
      { error: 'Failed to delete option' },
      { status: 500 }
    )
  }
}
