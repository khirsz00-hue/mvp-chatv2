import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'

export async function POST(req: Request) {
  try {
    const { taskContent, taskDescription } = await req.json()
    
    if (!taskContent) {
      return NextResponse.json({ error: 'Missing taskContent' }, { status: 400 })
    }
    
    const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD.

Zadanie: "${taskContent}"
${taskDescription ? `Opis: "${taskDescription}"` : ''}

Wygeneruj:
1. **4-7 konkretnych subtasków** (kroków do wykonania)
2. **Całkowitą estymację** czasu (suma subtasków w minutach)
3. **Najlepszy dzień tygodnia** (0=niedziela... 6=sobota)
4. **Najlepsza pora dnia** (morning/afternoon/evening)
5. **Uzasadnienie schedulingu** (1-2 zdania)
6. **2-3 praktyczne tipy**

Zwróć JSON:
{
  "steps": [
    {"title": "Krok 1", "description": "Dokładny opis", "estimatedMinutes": 30}
  ],
  "totalEstimation": 120,
  "bestDayOfWeek": 2,
  "bestTimeOfDay": "morning",
  "schedulingReasoning": "...",
  "tips": ["Tip 1", "Tip 2"]
}`

    const openai = getOpenAIClient()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Jesteś asystentem ADHD specjalizującym się w dekompozycji zadań na małe, zarządzalne kroki.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
    
    const response = JSON.parse(completion.choices[0].message.content || '{}')
    
    return NextResponse.json(response)
  } catch (err: any) {
    console.error('Error in breakdown-task:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
