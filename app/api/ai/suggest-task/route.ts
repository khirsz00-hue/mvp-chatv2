import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'

export async function POST(req: Request) {
  try {
    const { title } = await req.json()
    
    if (!title || title.length < 5) {
      return NextResponse.json({ error: 'Title too short' }, { status: 400 })
    }
    
    const prompt = `Na podstawie tytułu zadania: "${title}"

Zasugeruj:
1. Priorytet (1-4, gdzie 1 = najwyższy)
2. Estymowany czas wykonania (w minutach)
3. Krótki opis zadania (1-2 zdania, konkretne wskazówki)

Zwróć JSON:
{
  "priority": 2,
  "estimatedMinutes": 60,
  "description": "..."
}`

    const openai = getOpenAIClient()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Jesteś asystentem pomagającym oszacować wymagania zadania.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' }
    })
    
    const response = JSON.parse(completion.choices[0].message.content || '{}')
    
    return NextResponse.json(response)
  } catch (err: any) {
    console.error('Error in suggest-task:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
