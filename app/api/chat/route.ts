import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

type SimpleChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  try {
    const { message, token, tasks: providedTasks, mode, taskId, taskTitle, history = [] } = await req.json()

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
        tasks = providedTasks
      } else {
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Todoist API error: ${res.status}`)
        tasks = await res.json()
      }
    } else if (providedTasks?.length) {
      tasks = providedTasks
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    // 🧠 SYSTEM PROMPT – bez zmian, tylko mocniej akcentuje zadanie
    let systemPrompt = ''
    if (mode === 'task' || mode === 'help') {
      systemPrompt = `
Jesteś inteligentnym asystentem pomagającym użytkownikowi w realizacji konkretnego zadania.

Zadanie użytkownika: "${taskTitle || '(brak tytułu)'}"

Twoje zasady:
- Odpowiadasz po polsku.
- Zawsze odnosisz się do tego konkretnego zadania, nie pytaj o jego nazwę.
- Najpierw pomóż doprecyzować cel, zakres, termin, przeszkody i oczekiwany efekt.
- Potem wspólnie z użytkownikiem opracuj plan działania krok po kroku.
- Jeśli użytkownik pisze coś ogólnego („pomóż mi z tym”, „nie wiem jak zacząć”), automatycznie zakładaj, że chodzi o zadanie "${taskTitle}".
- Nie zmieniaj tematu, nie proś o wyjaśnienie tytułu zadania — zawsze zakładaj, że kontekst to "${taskTitle}".
- Możesz proponować działania, checklisty, analizować priorytety i kolejne kroki.
`.trim()
    } else if (token) {
      const taskList =
        tasks.length > 0
          ? tasks.map((t) => `- ${t.content}${t.due?.date ? ` (termin: ${t.due.date})` : ''}`).join('\n')
          : '(Brak zadań w Todoist)'

      systemPrompt = `
Jesteś inteligentnym asystentem produktywności zintegrowanym z Todoist.
Zasady:
- Odpowiadasz po polsku.
- Jeśli użytkownik prosi o "pogrupowanie", utwórz logiczne kategorie (np. Finanse, IT, Sprawy osobiste).
- Nie wymyślaj nowych zadań spoza listy.
Dostępne zadania:
${taskList}
`.trim()
    } else {
      systemPrompt = `
Jesteś przyjaznym asystentem AI pomagającym użytkownikowi w planowaniu i organizacji pracy.
`.trim()
    }

    // 📜 KONWERSACJA – historia + bieżąca wiadomość z tytułem zadania w treści
    const conversation: SimpleChatMessage[] = Array.isArray(history)
      ? history.slice(-10).map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content || ''),
        }))
      : []

    // 🧩 DODANE: dopisujemy tytuł zadania bezpośrednio do treści użytkownika
    const contextualUserMessage =
      mode === 'task' || mode === 'help'
        ? `Zadanie: "${taskTitle}". Użytkownik napisał: ${message}`
        : message

    const messages: SimpleChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation,
      { role: 'user', content: contextualUserMessage },
    ]

    // 🧠 Zapytanie do OpenAI
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages,
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
