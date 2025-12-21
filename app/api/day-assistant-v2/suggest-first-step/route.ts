import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { task_id, title, description, user_context } = await request.json()
    
    const prompt = `
Zadanie: ${title}
Opis: ${description || 'Brak szczegółowego opisu'}
Kontekst użytkownika: ${user_context || 'Brak dodatkowego kontekstu'}

Zaproponuj jeden konkretny pierwszy krok do wykonania w 10-15 minut, który:
- Jest bardzo konkretny i wykonalny
- Nie wymaga więcej niż 15 minut
- Rozpoczyna pracę nad zadaniem
- Daje momentum do kontynuacji
- Jest napisany w języku polskim
- Jest jednym zdaniem (maksymalnie dwa)

Odpowiedz TYLKO tekstem kroku, bez dodatkowego formatowania, bez emoji, bez numeracji.
Przykład dobrej odpowiedzi: "Przygotuj listę 5 najważniejszych wymagań do zadania"
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Jesteś asystentem pomagającym rozbijać duże zadania na małe, wykonalne kroki. Zawsze odpowiadasz konkretnie i zwięźle.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    })

    const first_step = completion.choices[0].message.content?.trim()

    return NextResponse.json({ first_step })
  } catch (error) {
    console.error('[suggest-first-step] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate first step' },
      { status: 500 }
    )
  }
}
