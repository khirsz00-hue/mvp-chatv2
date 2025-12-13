import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { title, description, userContext } = await req.json()
    
    if (!title || title.length < 3) {
      return NextResponse.json({ error: 'Title too short' }, { status: 400 })
    }
    
    const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD w zarządzaniu zadaniami. 

Użytkownik tworzy nowe zadanie: 
Tytuł: "${title}"
${description ?  `Opis: "${description}"` : ''}

Kontekst użytkownika:
${userContext?. recentTasks ? `Ostatnie zadania:\n${userContext.recentTasks.slice(0, 5).map((t:  any) => `- ${t.content} (projekt: ${t.project_name || 'brak'}, priorytet: P${t.priority})`).join('\n')}` : ''}

${userContext?.projects ? `Dostępne projekty:\n${userContext.projects.map((p: any) => `- ${p.name}`).join('\n')}` : ''}

Na podstawie tytułu i kontekstu zasugeruj: 

1. **Priorytet** (1-4):
   - 1 = Krytyczne/Pilne (deadline dziś/jutro, blokuje inne zadania)
   - 2 = Wysokie (ważne, deadline w tym tygodniu)
   - 3 = Normalne (rutynowe, deadline >1 tydzień)
   - 4 = Niskie (nice-to-have, bez deadline)

2. **Estymowany czas** (w minutach):
   - Szybkie: 15-30 min
   - Średnie: 30-90 min
   - Długie: 90-180 min
   - Bardzo długie: >180 min

3. **Opis zadania** (1-2 zdania praktycznych wskazówek co i jak zrobić)

4. **Sugerowany projekt** (nazwa z dostępnych projektów lub null jeśli nie pasuje)

5. **Sugerowana data wykonania** (format YYYY-MM-DD):
   - Pilne: dziś lub jutro
   - Ważne: w ciągu 3 dni
   - Normalne: w ciągu tygodnia
   - Niskie: w ciągu 2 tygodni

6. **Sugerowane etykiety** (2-4 słowa kluczowe opisujące zadanie)

7. **Uzasadnienie** (krótkie wyjaśnienie dlaczego te sugestie - 1-2 zdania)

Zwróć odpowiedź jako JSON: 
{
  "priority": 2,
  "estimatedMinutes": 60,
  "description": "Konkretny opis co zrobić.. .",
  "suggestedProject": "Nazwa projektu" lub null,
  "suggestedDueDate": "2025-01-15",
  "suggestedLabels": ["etykieta1", "etykieta2"],
  "reasoning": "Krótkie wyjaśnienie sugestii..."
}`

    const openai = getOpenAIClient()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Jesteś asystentem ADHD pomagającym oszacować wymagania zadania na podstawie tytułu i kontekstu użytkownika.  Bądź praktyczny i konkretny.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' }
    })
    
    const response = JSON.parse(completion.choices[0].message.content || '{}')
    
    return NextResponse.json(response)
  } catch (err:  any) {
    console.error('Error in suggest-task-advanced:', err)
    return NextResponse.json({ 
      error: err.message || 'Internal server error' 
    }, { status: 500 })
  }
}
