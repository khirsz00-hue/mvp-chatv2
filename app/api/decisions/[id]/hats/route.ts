// API Route: /api/decisions/[id]/hats
// Handles Six Thinking Hats workflow operations

import { NextRequest, NextResponse } from 'next/server'
import { getDecisionById, saveHatAnswer, moveToNextHat, saveSynthesis } from '@/lib/services/decisionService'
import { generateHatQuestions, analyzeHatAnswer, generateSynthesis, withRetry } from '@/lib/services/sixHatsAI'
import { getNextHat } from '@/lib/prompts/sixHats'
import type { HatColor, HatAnswer } from '@/lib/types/decisions'

interface RouteContext {
  params: {
    id: string
  }
}

// POST /api/decisions/[id]/hats - Generate questions for current hat or process answer
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = params
    const body = await request.json()
    const { action, userAnswer, hatColor } = body

    // Get decision
    const decision = await getDecisionById(id)
    if (!decision) {
      return NextResponse.json(
        { error: 'Decision not found' },
        { status: 404 }
      )
    }

    // Handle different actions
    if (action === 'generate_questions') {
      // Generate questions for current or specified hat
      const targetHat: HatColor = hatColor || decision.current_hat || 'blue'
      
      try {
        const questions = await withRetry(() => 
          generateHatQuestions(decision, targetHat)
        )

        // If this is the first hat, update current_hat
        if (!decision.current_hat) {
          await moveToNextHat(id, 'blue')
        }

        return NextResponse.json({
          success: true,
          hat: targetHat,
          questions,
        })
      } catch (error: any) {
        console.error('Error generating questions:', error)
        return NextResponse.json(
          { error: 'Nie udało się wygenerować pytań. Spróbuj ponownie.', details: error.message },
          { status: 500 }
        )
      }
    }

    if (action === 'submit_answer') {
      // Process user answer and generate AI analysis
      if (!hatColor || !userAnswer) {
        return NextResponse.json(
          { error: 'hatColor and userAnswer are required' },
          { status: 400 }
        )
      }

      const targetHat: HatColor = hatColor

      try {
        // Get questions (might be from previous request or regenerate)
        const questions = body.questions || await withRetry(() => 
          generateHatQuestions(decision, targetHat)
        )

        // Generate AI analysis of the answer
        const aiAnalysis = await withRetry(() =>
          analyzeHatAnswer(decision, targetHat, userAnswer, questions)
        )

        // Save hat answer
        const hatAnswer: HatAnswer = {
          hat: targetHat,
          questions,
          userAnswer,
          aiAnalysis,
          timestamp: new Date().toISOString(),
        }

        await saveHatAnswer(id, hatAnswer)

        // Determine next hat
        const nextHat = getNextHat(targetHat)
        await moveToNextHat(id, nextHat)

        // If all hats complete, generate synthesis
        let synthesis = null
        if (nextHat === null) {
          try {
            const updatedDecision = await getDecisionById(id)
            if (updatedDecision && updatedDecision.hat_answers) {
              synthesis = await withRetry(() =>
                generateSynthesis(updatedDecision, updatedDecision.hat_answers || [])
              )
              await saveSynthesis(id, synthesis)
            }
          } catch (error) {
            console.error('Error generating synthesis:', error)
            // Don't fail the request if synthesis fails
          }
        }

        return NextResponse.json({
          success: true,
          hatAnswer,
          nextHat,
          completed: nextHat === null,
          synthesis,
        })
      } catch (error: any) {
        console.error('Error processing answer:', error)
        return NextResponse.json(
          { error: 'Nie udało się przetworzyć odpowiedzi. Spróbuj ponownie.', details: error.message },
          { status: 500 }
        )
      }
    }

    if (action === 'skip_hat') {
      // Skip current hat without answering
      if (!hatColor) {
        return NextResponse.json(
          { error: 'hatColor is required' },
          { status: 400 }
        )
      }

      const targetHat: HatColor = hatColor
      const nextHat = getNextHat(targetHat)
      await moveToNextHat(id, nextHat)

      return NextResponse.json({
        success: true,
        nextHat,
        completed: nextHat === null,
      })
    }

    if (action === 'regenerate_synthesis') {
      // Regenerate synthesis after all hats are complete
      try {
        const updatedDecision = await getDecisionById(id)
        if (!updatedDecision || !updatedDecision.hat_answers || updatedDecision.hat_answers.length === 0) {
          return NextResponse.json(
            { error: 'Cannot generate synthesis - no hat answers found' },
            { status: 400 }
          )
        }

        const synthesis = await withRetry(() =>
          generateSynthesis(updatedDecision, updatedDecision.hat_answers || [])
        )
        await saveSynthesis(id, synthesis)

        return NextResponse.json({
          success: true,
          synthesis,
        })
      } catch (error: any) {
        console.error('Error regenerating synthesis:', error)
        return NextResponse.json(
          { error: 'Nie udało się wygenerować syntezy. Spróbuj ponownie.', details: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/decisions/[id]/hats:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/decisions/[id]/hats - Get current hat status and progress
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

    return NextResponse.json({
      currentHat: decision.current_hat,
      hatAnswers: decision.hat_answers || [],
      completed: decision.current_hat === null && decision.hat_answers && decision.hat_answers.length > 0,
    })
  } catch (error: any) {
    console.error('Error in GET /api/decisions/[id]/hats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
