// API Route: /api/decisions/[id]/analyze
// Handles AI analysis of decisions
import { NextRequest, NextResponse } from 'next/server'
import {
  getDecisionById,
  updateDecision,
  createDecisionEvent,
} from '@/lib/services/decisionService'
import { analyzeDecision } from '@/lib/services/decisionAI'

interface RouteContext {
  params: {
    id: string
  }
}

// POST /api/decisions/[id]/analyze - Trigger AI analysis
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = params
    const body = await request.json()
    const { analysisType = 'full' } = body

    // Get decision with options
    const decisionData = await getDecisionById(id)

    if (!decisionData) {
      return NextResponse.json(
        { error: 'Decision not found' },
        { status: 404 }
      )
    }

    // Update status to analyzing
    await updateDecision(id, { status: 'analyzing' })

    // Perform AI analysis
    const analysis = await analyzeDecision({
      decision: decisionData,
      options: decisionData.options || [],
      analysisType,
    })

    // Create AI analysis event
    await createDecisionEvent(id, 'ai_analysis', {
      analysisType,
      confidence: analysis.confidence,
      recommendation: analysis.recommendation,
    }, analysis.analysis)

    // Update status to analyzed
    await updateDecision(id, { status: 'analyzed' })

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Error in POST /api/decisions/[id]/analyze:', error)
    
    // Revert status on error
    const { id } = params
    await updateDecision(id, { status: 'pending' })
    
    return NextResponse.json(
      { error: 'Failed to analyze decision' },
      { status: 500 }
    )
  }
}
