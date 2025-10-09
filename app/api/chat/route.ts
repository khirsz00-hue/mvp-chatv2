import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context, todoist_token } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Brak wiadomości.' }, { status: 400 })
    }

    const lower = message.toLowerCase()
    const taskKeywords = ['zadania', 'taski', 'lista', 'na dziś', 'na dzis', 'co mam dziś', 'co mam dzis']

    // 🔹 Token Todoista
    const token = todoist_token || process.env.TODOIST_API_TOKEN
    if (!token) {
      console.error('🚫 Brak tokena Todoist!')
      return NextResponse.json({ reply: 'Nie znaleziono tokena Todoist 😞', type: 'error' })
    }

    // 🧠 Jeśli wiadomość dotyczy zadań
    if (taskKeywords.some((k) => lower.includes(k))) {
      try {
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        if (!res.ok) {
          console.error('❌ Błąd Todoist API:', await res.text())
          throw new Error(`Błąd Todoist API: ${res.status}`)
        }

        const tasks = await res.json()
        const today = new Date().toISOString().split('T')[0]
        const todaysTasks = tasks.filter((t: any) => t.due?.date === today)

        if (todaysTasks.length === 0) {
          return NextResponse.json({
            type: 'tasks',
            tasks: [],
            reply: 'Nie masz dziś żadnych zaplanowanych zadań ✅',
          })
        }

        return NextResponse.json({
          type: 'tasks',
          tasks: todaysTasks.map((t: any) => ({
            id: t.id,
            content: t.content,
            due: t.due?.date || null,
            priority: t.priority,
          })),
          reply: `Znalazłem ${todaysTasks.length} zadań na dziś ✅`,
        })
      } catch (err) {
        console.error('❌ Błąd Todoist:', err)
        return NextResponse.json({
          reply: 'Nie udało się pobrać zadań z Todoista 😞',
          type: 'error',
        })
      }
    }

    // 🧩 OpenAI (reszta bez zmian)
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = `
      Jesteś asystentem produktywności, który pomaga użytkownikowi wykonać zadanie krok po kroku.
      Jeśli użytkownik pyta o listę zadań, zawsze używaj API Todoista.
      Zawsze odpowiadaj po polsku, jasno i konkretnie.
      ${context ? `Kontekst zadania: ${context}` : ''}
    `.trim()

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.trim() },
      ],
    })

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      '⚠️ Brak odpowiedzi od modelu.'

    return NextResponse.json({ reply, type: 'text' })
  } catch (error: any) {
    console.error('❌ Błąd w /api/chat:', error)
    return NextResponse.json(
      { error: error.message || 'Nieoczekiwany błąd serwera.' },
      { status: 500 }
    )
  }
}
