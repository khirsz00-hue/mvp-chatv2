import { NextResponse } from 'next/server'
import { DecisionService } from '@/src/features/decision-assistant/services/decisionService'
import { DecisionAIService } from '@/src/features/decision-assistant/services/aiService'
import { getNextHat, isAnalysisComplete } from '@/src/features/decision-assistant/prompts/hats'
import { HatColor } from '@/src/features/decision-assistant/types'

// POST /api/decision/[id]/run - Run AI analysis for current hat
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { userInput, forceHat } = body

    // Get decision and options
    const { decision, options } = await DecisionService.getDecision(id)

    // Determine which hat to analyze
    let hatColor: HatColor
    if (forceHat) {
      hatColor = forceHat
    } else if (decision.current_hat) {
      hatColor = decision.current_hat as HatColor
    } else {
      hatColor = 'blue' // Start with blue hat
    }

    // Check if it's the start (blue hat at beginning)
    const isStart = hatColor === 'blue' && !decision.current_hat

    // Save user input if provided
    if (userInput) {
      await DecisionService.addEvent(
        id,
        hatColor,
        'user_input',
        userInput
      )
    }

    // Run AI analysis
    const aiResponse = await DecisionAIService.analyzeWithHat(
      decision,
      options,
      hatColor,
      isStart
    )

    // Save AI analysis as event
    await DecisionService.addEvent(
      id,
      hatColor,
      'analysis',
      `AI Analysis for ${hatColor} hat`,
      aiResponse
    )

    // Update to next hat
    const nextHat = getNextHat(hatColor)
    await DecisionService.updateCurrentHat(id, nextHat)

    // Check if analysis is complete
    const complete = isAnalysisComplete(nextHat)

    // If complete, generate synthesis
    let synthesis = null
    if (complete) {
      const events = await DecisionService.getEvents(id)
      synthesis = await DecisionAIService.generateSynthesis(decision, events)
      
      // Save synthesis as event
      await DecisionService.addEvent(
        id,
        'blue', // Synthesis goes under blue hat
        'synthesis',
        'Final synthesis',
        JSON.stringify(synthesis)
      )

      // Mark decision as completed
      await DecisionService.updateDecision(id, { status: 'completed' })
    } else {
      // Mark as in progress
      await DecisionService.updateDecision(id, { status: 'in_progress' })
    }

    return NextResponse.json({
      hatColor,
      aiResponse,
      nextHat,
      complete,
      synthesis
    })
  } catch (err: any) {
    console.error('Error in /api/decision/[id]/run:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
