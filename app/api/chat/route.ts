import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, token, tasks: providedTasks } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    if (!token) {
      return NextResponse.json({ error: 'Brak tokena Todoist' }, { status: 400 })
    }

    const lower = message.toLowerCase()
    let tasks: any[] = []

    // 🔹 Zakres filtracji (opcjonalny)
    let filter = ''
    if (lower.includes('jutro')) filter = 'tomorrow'
    else if (lower.includes('tydzień') || lower.includes('tydzien')) filter = '7 days'
    else if (lower.includes('miesiąc') || lower.includes('miesiac')) filter = '30 days'
    else if (lower.includes('przeterminowane')) filter = 'overdue'
    else filter = 'today'

    // 🧩 Pobranie lub użycie zadań z frontu
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

    // 🧠 Analiza AI
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const taskList =
      tasks.length > 0
        ? tasks.map((t) => `- ${t.content}${t.due?.date ? ` (termin: ${t.due.date})` : ''}`).join('\n')
        : '(Brak zadań)'

    const systemPrompt = `
Jesteś inteligentnym asystentem produktywności zintegrowanym z Todoist.
Zasady:
- Odpowiadasz po polsku.
- Jeśli użytkownik prosi o "pogrupowanie", utwórz logiczne kategorie (np. Finanse, IT, Sprawy osobiste).
- Nie wymyślaj nowych zadań spoza listy.
- Jeśli nie masz danych, poproś użytkownika o kontekst.
Dostępne zadania:
${taskList}
    `.trim()

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    })

    const reply = completion.choices[0]?.message?.content || '🤖 Brak odpowiedzi od AI.'
    console.log('💬 Odpowiedź AI:', reply.slice(0, 300))

    // ✅ ZAWSZE zwracamy `content` (nie `reply`)
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
