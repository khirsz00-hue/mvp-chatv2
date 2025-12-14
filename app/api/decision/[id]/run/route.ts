import { NextResponse } from 'next/server'
import { DecisionService } from '@/src/features/decision-assistant/services/decisionService'
import { AIService } from '@/src/features/decision-assistant/services/aiService'
import { HAT_PROMPTS } from '@/src/features/decision-assistant/prompts/hats'
import type { HatColor } from '@/src/features/decision-assistant/types'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { hatColor } = body as { hatColor: HatColor }

    if (!hatColor) {
      return NextResponse.json(
        { error: 'Missing hatColor' },
        { status: 400 }
      )
    }

    const result = await DecisionService.getDecision(params.id)
    const hatPrompt = HAT_PROMPTS[hatColor]

    const aiResponse = await AIService.analyzeWithHat(
      hatColor,
      result.decision.title,
      result.decision.description,
      result.options,
      hatPrompt.prompt
    )

    await DecisionService.addEvent(
      params.id,
      hatColor,
      'analysis',
      hatPrompt.prompt,
      aiResponse
    )

    return NextResponse.json({ aiResponse })
  } catch (err: any) {
    console.error('Error in /api/decision/[id]/run:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to run analysis' },
      { status: 500 }
    )
  }
}
