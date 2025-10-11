import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  console.group('🤖 [API CHAT]')
  try {
    const { message, token, tasks: providedTasks } = await req.json()

    if (!message) {
      console.error('❌ Brak wiadomości w żądaniu!')
      console.groupEnd()
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    if (!token && (!providedTasks || providedTasks.length === 0)) {
      console.error('❌ Brak tokena i brak zadań z frontu!')
      console.groupEnd()
      return NextResponse.json(
        { error: 'Brak źródła zadań (token lub lista)' },
        { status: 400 }
      )
    }

    const lower = message.toLowerCase()
    let tasks: any[] = []

    // 🧩 Zakres filtracji
    let filter = ''
    if (lower.includes('jutro')) filter = 'tomorrow'
    else if (lower.includes('tydzień') || lower.includes('tydzien')) filter = '7 days'
    else if (lower.includes('miesiąc') || lower.includes('miesiac')) filter = '30 days'
    else if (lower.includes('przeterminowane')) filter = 'overdue'
    else filter = 'today'

    console.log(`🕓 Zakres filtracji Todoist: ${filter}`)

    // 🔹 Jeśli dostarczono zadania z frontu – użyj ich
    if (providedTasks && providedTasks.length > 0) {
      console.log(`📦 Używam ${providedTasks.length} zadań z frontu.`)
      tasks = providedTasks
    } else {
      // 🌐 W przeciwnym razie pobierz z Todoista
      console.log('🌐 Pobieram zadania z Todoista...')
      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log(`🔐 Status odpowiedzi Todoist: ${res.status}`)

      if (!res.ok) {
        const text = await res.text()
        console.error('⚠️ Błąd odpowiedzi Todoist:', text)
        console.groupEnd()
        return NextResponse.json(
          { error: `Błąd Todoist: ${res.status} ${text}` },
          { status: 500 }
        )
      }

      const all = await res.json()
      const now = new Date()

      const dateCheck = (taskDate: string) => {
        if (!taskDate) return false
        const d = new Date(taskDate)
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (filter === 'today') return d.toDateString() === now.toDateString()
        if (filter === 'tomorrow') return diffDays >= 0.5 && diffDays < 1.5
        if (filter === '7 days') return diffDays >= 0 && diffDays < 7
        if (filter === '30 days') return diffDays >= 0 && diffDays < 30
        if (filter === 'overdue') return d < now
        return false
      }

      tasks = all.filter((t: any) => t.due?.date && dateCheck(t.due.date))
      console.log(`✅ Znaleziono ${tasks.length} zadań.`)
    }

    // ✅ Jeśli użytkownik prosi o taski → zwróć je bez AI
    const isTaskQuery =
      lower.includes('taski') ||
      lower.includes('zadań') ||
      lower.includes('pokaż') ||
      lower.includes('daj')

    if (isTaskQuery && tasks.length > 0) {
      console.log('🧾 Zwracam karty zadań do frontu.')
      console.groupEnd()
      return NextResponse.json({
        role: 'assistant',
        type: 'tasks',
        timestamp: Date.now(),
        tasks: tasks.map((t: any) => ({
          id: t.id,
          content: t.content,
          due: t.due?.date,
          priority: t.priority || 1,
        })),
      })
    }

    // 🧠 Analiza AI (np. "pogrupuj te zadania")
    console.log('🧠 Przekazuję zadania do OpenAI...')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const taskContext =
      tasks.length > 0
        ? tasks
            .map(
              (t) =>
                `- ${t.content}${
                  t.due ? ` (termin: ${t.due})` : ''
                }${t.priority ? ` [priorytet ${t.priority}]` : ''}`
            )
            .join('\n')
        : '(Brak zadań do analizy)'

    const systemPrompt = `
Jesteś inteligentnym asystentem produktywności zintegrowanym z Todoist.

Zasady:
- Odpowiadasz po polsku.
- Jeśli użytkownik prosi o "pogrupowanie", utwórz logiczne kategorie (np. Finanse, IT, Sprawy osobiste) i przypisz zadania do nich.
- Jeśli użytkownik pyta o plan lub priorytety, zaproponuj konkretną kolejność działań.
- Nie wymyślaj zadań spoza listy.
- Jeśli nie masz żadnych danych, poproś o kontekst.

Dostępne zadania:
${taskContext}
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
    console.log(`💬 Odpowiedź AI: ${reply.slice(0, 150)}...`)

    console.groupEnd()
    return NextResponse.json({
      role: 'assistant',
      type: 'text',
      timestamp: Date.now(),
      content: reply,
    })
  } catch (err: any) {
    console.error('❌ Błąd /api/chat:', err)
    console.groupEnd()
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
