import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context, todoist_token } = await req.json()

    // 🧩 Walidacja wejścia
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Nieprawidłowa wiadomość — oczekiwano tekstu.' },
        { status: 400 }
      )
    }

    const lower = message.toLowerCase()
    const taskKeywords = [
      'zadania',
      'taski',
      'lista',
      'na dziś',
      'na dzis',
      'co mam dziś',
      'co mam dzis',
      'todo',
    ]

    // 🔹 Token Todoista (najpierw użytkownika, potem fallback .env)
    const token = todoist_token || process.env.TODOIST_API_TOKEN

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
          console.error('❌ Błąd Todoist API:', res.status)
          throw new Error(`Błąd Todoist API: ${res.status}`)
        }

        const tasks = await res.json()
        const today = new Date().toISOString().split('T')[0]

        // 🔹 Zadania na dziś
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

    // 🧩 Sprawdzenie API keya OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Brak OPENAI_API_KEY w środowisku!')
      return NextResponse.json(
        { error: 'Brak konfiguracji OpenAI API Key.' },
        { status: 500 }
      )
    }

    // 🔮 OpenAI
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = `
      Jesteś asystentem produktywności, który pomaga użytkownikowi wykonać zadanie krok po kroku.
      Jeśli użytkownik pyta o listę zadań, zawsze używaj API Todoista (nie wymyślaj odpowiedzi).
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
    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Nieoczekiwany błąd serwera.'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
