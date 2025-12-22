/**
 * API Route: /api/day-assistant-v2/decompose
 * POST: Decompose task into smaller subtasks using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { task_title, what_to_do, completion_criteria, blockers } = await request.json()

    if (!task_title || !what_to_do || !completion_criteria) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Initialize OpenAI client at runtime
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const prompt = `
Zadanie: "${task_title}"

Kontekst od użytkownika:
- Co trzeba zrobić: ${what_to_do}
- Kryteria ukończenia: ${completion_criteria}
${blockers ? `- Blokery/zależności: ${blockers}` : ''}

Na podstawie tego kontekstu zaproponuj 3-5 konkretnych kroków do wykonania.
Każdy krok powinien być:
- Konkretny i wykonalny
- Mieć realny szacunek czasu (5-60 min)
- Prowadzić do ukończenia zadania

Odpowiedz w formacie JSON:
{
  "steps": [
    {
      "title": "Konkretny krok do wykonania",
      "estimated_minutes": 15,
      "order": 1
    }
  ]
}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Jesteś ekspertem w dekompozycji zadań na małe, wykonalne kroki. Zawsze odpowiadasz w formacie JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({ steps: result.steps || [] })
  } catch (error) {
    console.error('[Decompose] Error:', error)
    return NextResponse.json({ error: 'Failed to generate steps' }, { status: 500 })
  }
}
