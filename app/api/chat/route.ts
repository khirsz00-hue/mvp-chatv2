import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const {
      message,
      token,
      tasks: providedTasks,
      mode,
      taskId,
      taskTitle,
      history = [],
    } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    const lower = message.toLowerCase()
    let tasks: any[] = []

    // 🔹 Zakres filtracji (opcjonalny, tylko dla Todoist)
    let filter = ''
    if (lower.includes('jutro')) filter = 'tomorrow'
    else if (lower.includes('tydzień') || lower.includes('tydzien')) filter = '7 days'
    else if (lower.includes('miesiąc') || lower.includes('miesiac')) filter = '30 days'
    else if (lower.includes('przeterminowane')) filter = 'overdue'
    else filter = 'today'

    // 🧩 Pobranie lub użycie zadań (jeśli tryb Todoist)
    if (token) {
      if (providedTasks && providedTasks.length > 0) {
        console.log(`📦 Otrzymano ${providedTasks.length} zadań z frontu.`)
        tasks = providedTasks
      } else {
        console.log('🌐 Brak zadań z frontu — pobieram z Todoista...')
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Todoist API error: ${res.status}`)
        tasks = await res.json()
        console.log(`✅ Znaleziono zadań w Todoist: ${tasks.length}`)
      }
    } else if (providedTasks?.length) {
      tasks = providedTasks
    }

    // 🔧 Przygotowanie promptu kontekstowego
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    let systemPrompt = ''

    if (mode === 'task') {
      systemPrompt = `
Jesteś inteligentnym asystentem pomagającym użytkownikowi w realizacji konkretnego zadania.
Nie masz dostępu do Todoist.
Twoim celem jest pomóc użytkownikowi w zrozumieniu, zaplanowaniu i realizacji tego zadania krok po kroku.

Zadanie: "${taskTitle || '(brak tytułu)'}"

Zasady:
- Odpowiadasz po polsku.
- Nie pytaj ponownie o to samo, jeśli masz już kontekst z historii.
- Jeśli użytkownik pisze "rozwiń to dalej", "kontynuuj" lub "doprecyzuj", kontynuuj wątek logicznie.
- Możesz proponować działania, checklisty, analizować priorytety, sugerować dalsze kroki.
`.trim()
    } else if (token) {
      const taskList =
        tasks.length > 0
          ? tasks
              .map((t) => `- ${t.content}${t.due?.date ? ` (termin: ${t.due.date})` : ''}`)
              .join('\n')
          : '(Brak zadań w Todoist)'

      systemPrompt = `
Jesteś inteligentnym asystentem produktywności zintegrowanym z Todoist.
Zasady:
- Odpowiadasz po polsku.
- Jeśli użytkownik prosi o "pogrupowanie", utwórz logiczne kategorie (np. Finanse, IT, Sprawy osobiste).
- Nie wymyślaj nowych zadań spoza listy.
- Jeśli nie masz danych, poproś użytkownika o kontekst.
Dostępne zadania:
${taskList}
`.trim()
    } else {
      systemPrompt = `
Jesteś przyjaznym asystentem AI pomagającym użytkownikowi w planowaniu i organizacji pracy.
`.trim()
    }

    // 🧩 Konwersja historii rozmowy (z typowaniem)
    const conversation: ChatCompletionMessageParam[] = Array.isArray(history)
      ? history.slice(-10).map((msg: any) => ({
          role: (msg.role === 'assistant' ? 'assistant' : 'user') as ChatCompletionMessageParam['role'],
          content: msg.content,
        }))
      : []

    // 🧠 Zapytanie do OpenAI z pełnym kontekstem
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...conversation,
        { role: 'user' as const, content: message },
      ],
    })

    const reply = completion.choices[0]?.message?.content?.trim() || '🤖 Brak odpowiedzi od AI.'
    console.log('💬 Odpowiedź AI:', reply.slice(0, 200))

    return NextResponse.json({
      success: true,
      content: reply,
      timestamp: Date.now(),
    })
  } catch (err: any) {
    console.error('❌ Błąd /api/chat:', err)
    return NextResponse.json({ error: err.message, type: 'error' }, { status: 500 })
  }
}
