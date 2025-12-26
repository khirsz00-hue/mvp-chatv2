import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { title, description, understanding, userContext, userId } = await req.json()
    
    if (!title || title.length < 3) {
      return NextResponse.json({ error: 'Title too short' }, { status: 400 })
    }
    
    const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD w zarządzaniu zadaniami. 

Użytkownik chce szczegółowy plan działania dla zadania:
Tytuł: "${title}"
${description ? `Opis: "${description}"` : ''}
${understanding ? `AI rozumie to jako: "${understanding}"` : ''}

Kontekst użytkownika:
${userContext?.projects ? `Dostępne projekty:\n${userContext.projects.map((p: any) => `- ${p.name}`).join('\n')}` : ''}

Stwórz szczegółowy, praktyczny plan działania składający się z 3-6 kroków.
Każdy krok powinien być:
- Konkretny i wykonalny
- Jasno sformułowany
- Nie dłuższy niż jedno zdanie
- Używaj czasowników w trybie rozkazującym

Dodatkowo oszacuj:

1. **Priorytet** (1-4):
   - 1 = Krytyczne/Pilne (deadline dziś/jutro, blokuje inne zadania)
   - 2 = Wysokie (ważne, deadline w tym tygodniu)
   - 3 = Normalne (rutynowe, deadline >1 tydzień)
   - 4 = Niskie (nice-to-have, bez deadline)

2. **Cognitive Load - Obciążenie kognitywne** (1-4):
   - 1 = Proste (zadania rutynowe, jasne instrukcje, mało decyzji)
   - 2 = Umiarkowane (wymaga uwagi, trochę planowania)
   - 3 = Złożone (wymaga skupienia, wiele etapów, decyzje)
   - 4 = Bardzo złożone (wymaga głębokiej koncentracji, kreatywności, rozwiązywania problemów)

3. **Estymowany czas** (w minutach):
   - Szybkie: 15-30 min
   - Średnie: 30-90 min
   - Długie: 90-180 min
   - Bardzo długie: >180 min

4. **Sugerowana data wykonania** (format YYYY-MM-DD):
   - WAŻNE: Dzisiaj jest ${new Date().toISOString().split('T')[0]}
   - Pilne: dziś lub jutro
   - Ważne: w ciągu 3 dni
   - Normalne: w ciągu tygodnia
   - Niskie: w ciągu 2 tygodni
   - NIGDY nie używaj dat z przeszłości!

5. **Sugerowany projekt** (nazwa z dostępnych projektów lub null jeśli nie pasuje)

6. **Sugerowane etykiety** (2-4 słowa kluczowe opisujące zadanie)

7. **Opis zadania** (jeśli pusty - 1-2 zdania praktycznych wskazówek co i jak zrobić)

Zwróć odpowiedź jako JSON:
{
  "actionPlan": ["Krok 1", "Krok 2", "Krok 3", ...],
  "priority": 2,
  "cognitiveLoad": 2,
  "estimatedMinutes": 60,
  "suggestedDueDate": "2025-12-27",
  "suggestedProject": "Nazwa projektu" lub null,
  "suggestedLabels": ["etykieta1", "etykieta2"],
  "description": "Opis zadania..."
}`

    const openai = getOpenAIClient()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `Jesteś asystentem ADHD pomagającym stworzyć praktyczny plan działania dla zadań. 
          
WAŻNE: Dzisiaj jest ${new Date().toISOString().split('T')[0]}. NIGDY nie używaj dat z przeszłości.
Plan powinien być konkretny, praktyczny i podzielony na małe, wykonalne kroki.` 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
    
    const response = JSON.parse(completion.choices[0].message.content || '{}')
    
    console.log('✅ [Generate Action Plan] Plan generated successfully')
    
    return NextResponse.json(response)
  } catch (err: any) {
    console.error('❌ [Generate Action Plan] Error:', err)
    return NextResponse.json({ 
      error: err.message || 'Internal server error' 
    }, { status: 500 })
  }
}
