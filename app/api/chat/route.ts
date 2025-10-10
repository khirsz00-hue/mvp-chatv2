import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    if (!message) {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    const lower = message.toLowerCase()
    const todoistToken = process.env.TODOIST_API_TOKEN
    let tasks: any[] = []

    // 🧩 Określ zakres czasowy
    let filter = ''
    if (lower.includes('jutro')) filter = 'tomorrow'
    else if (lower.includes('tydzień') || lower.includes('tydzien')) filter = '7 days'
    else if (lower.includes('miesiąc') || lower.includes('miesiac')) filter = '30 days'
    else if (lower.includes('przeterminowane')) filter = 'overdue'
    else filter = 'today'

    // 📦 Pobierz zadania z Todoista
    try {
      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${todoistToken}` },
      })
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
    } catch (err) {
      console.error('⚠️ Błąd Todoist API:', err)
    }

    // ✅ Jeśli użytkownik prosi o taski → zwróć je jako karty (bez udziału OpenAI)
    const isTaskQuery =
      lower.includes('taski') ||
      lower.includes('zadań') ||
      lower.includes('zadań') ||
      lower.includes('pokaż') ||
      lower.includes('daj')

    if (isTaskQuery && tasks.length > 0) {
      return NextResponse.json({
        role: 'assistant',
        type: 'tasks',
        timestamp: Date.now(),
        tasks: tasks.map((t: any) => ({
          id: t.id,
          content: t.content,
          due: t.due?.date || null,
          priority: t.priority || 1,
        })),
      })
    }

    // 🧠 Przygotuj prompt dla OpenAI (tylko gdy to pytanie analityczne)
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const taskContext =
      tasks.length > 0
        ? tasks.map((t) => `- ${t.content} (termin: ${t.due?.date || 'brak'})`).join('\n')
        : '(Brak zadań do analizy)'

    const systemPrompt = `
Jesteś osobistym asystentem produktywności zintegrowanym z Todoist.
Masz pomagać użytkownikowi w planowaniu, analizie i organizacji zadań.

Zasady:
- Odpowiadaj po polsku.
- Jeśli użytkownik prosi o grupowanie, wykonaj logiczny podział zadań wg tematów lub kategorii.
- Jeśli użytkownik prosi o plan, zaproponuj harmonogram działań.
- Jeśli brak danych, zapytaj o kontekst.

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
