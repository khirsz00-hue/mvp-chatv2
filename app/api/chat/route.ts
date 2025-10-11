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
      console.error('❌ Brak tokena Todoist w żądaniu!')
      return NextResponse.json({ error: 'Brak tokena Todoist' }, { status: 400 })
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

    console.log('🕓 Zakres filtracji Todoist:', filter)

    // ✅ Jeśli frontend przekazał taski — używamy ich zamiast pobierać z Todoista
    if (providedTasks && providedTasks.length > 0) {
      console.log(`📦 Otrzymano ${providedTasks.length} zadań z frontu.`)
      tasks = providedTasks.map((t: any) => ({
        id: t.id,
        content: t.content,
        due: t.due?.date || t.due || null, // obsługa różnych formatów
        priority: t.priority || 1,
      }))
      console.log('🧩 Przykładowe zadanie z frontu:', tasks[0])
    } else {
      console.log('🌐 Brak zadań z frontu — pobieram z Todoista...')
      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log('🔐 Status odpowiedzi Todoist:', res.status)

      if (!res.ok) {
        const text = await res.text()
        console.error('⚠️ Błąd odpowiedzi Todoist:', text)
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
      console.log('✅ Znaleziono zadań z Todoista:', tasks.length)
    }

    // ✅ Jeśli użytkownik prosi o taski → zwróć karty bez AI
    const isTaskQuery =
      lower.includes('taski') ||
      lower.includes('zadań') ||
      lower.includes('pokaż') ||
      lower.includes('daj')

    if (isTaskQuery && tasks.length > 0) {
      console.log('🧾 Zwracam karty zadań do frontu.')
      return NextResponse.json({
        role: 'assistant',
        type: 'tasks',
        timestamp: Date.now(),
        tasks: tasks.map((t: any) => ({
          id: t.id,
          content: t.content,
          due: t.due,
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
            .map((t) => `- ${t.content}${t.due ? ` (termin: ${t.due})` : ''}`)
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
    console.log('💬 Odpowiedź AI:', reply.slice(0, 120))

    return NextResponse.json({
      role: 'assistant',
      type: 'text',
      timestamp: Date.now(),
      content: reply,
    })
  } catch (err: any) {
    console.error('❌ Błąd /api/chat:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
