import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const { tasks, completedTasks } = await req.json()
    
    const prompt = `Przeanalizuj zadania użytkownika i wygeneruj 3-5 praktycznych insightów.

Aktywne zadania (${tasks?.length || 0}):
${tasks?.slice(0, 10).map((t: any) => `- ${t.content} (priorytet: P${t.priority}, termin: ${t.due})`).join('\n')}

Ukończone zadania (${completedTasks?.length || 0}):
${completedTasks?.slice(0, 10).map((t: any) => `- ${t.content} (ukończono: ${t.completed_at})`).join('\n')}

Zwróć odpowiedź w formacie JSON:
{
  "insights": [
    {
      "type": "warning" | "success" | "info",
      "title": "Krótki tytuł",
      "description": "1-2 zdania opisu",
      "actionText": "Opcjonalny tekst przycisku akcji"
    }
  ]
}

Skup się na:
- Przeciążeniu (za dużo zadań na dziś)
- Wzorcach sukcesu (co działa dobrze)
- Sugestiach poprawy (np. priorytetyzacja)
- Motywacji (pozytywne wzmocnienie)`

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Jesteś wspierającym asystentem ADHD, który pomaga użytkownikom lepiej zarządzać zadaniami.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })
    
    const response = JSON.parse(completion.choices[0].message.content || '{}')
    
    return NextResponse.json(response)
  } catch (err: any) {
    console.error('Error in insights:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
