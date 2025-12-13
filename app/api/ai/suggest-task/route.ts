import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { title, description, userContext, userId } = await req.json()
    
    if (!title || title.length < 3) {
      return NextResponse.json({ error: 'Title too short' }, { status: 400 })
    }
    
    // Fetch user analytics if userId provided
    let userAnalytics = null
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('user_task_analytics')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (!error && data) {
          userAnalytics = data
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
      }
    }
    
    const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD w zarządzaniu zadaniami. 

Użytkownik tworzy nowe zadanie: 
Tytuł: "${title}"
${description ?  `Opis: "${description}"` : ''}

Kontekst użytkownika:
${userContext?. recentTasks ? `Ostatnie zadania:\n${userContext.recentTasks.slice(0, 5).map((t:  any) => `- ${t.content} (projekt: ${t.project_name || 'brak'}, priorytet: P${t.priority})`).join('\n')}` : ''}

${userContext?.projects ? `Dostępne projekty:\n${userContext.projects.map((p: any) => `- ${p.name}`).join('\n')}` : ''}

${userAnalytics && userAnalytics.length > 0 ? `
Historia użytkownika (ostatnie ${userAnalytics.length} akcji):
${userAnalytics.slice(0, 10).map((a: any) => 
  `- ${a.action_type}: "${a.task_title}" (projekt: ${a.task_project || 'brak'}, priorytet: P${a.priority || 4}, etykiety: ${a.task_labels?.join(', ') || 'brak'})`
).join('\n')}

Wzorce użytkownika:
- Najczęściej używane projekty: ${(() => {
  const projects = userAnalytics.map((a: any) => a.task_project).filter(Boolean)
  const counts = projects.reduce((acc: any, p: string) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {})
  return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([p]: any) => p).join(', ') || 'brak'
})()}
- Najczęściej używane etykiety: ${(() => {
  const labels = userAnalytics.flatMap((a: any) => a.task_labels || [])
  const counts = labels.reduce((acc: any, l: string) => ({ ...acc, [l]: (acc[l] || 0) + 1 }), {})
  return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([l]: any) => l).join(', ') || 'brak'
})()}
- Przełożone zadania: ${userAnalytics.filter((a: any) => a.action_type === 'postponed').length}
- Ukończone zadania: ${userAnalytics.filter((a: any) => a.action_type === 'completed').length}
` : ''}

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
