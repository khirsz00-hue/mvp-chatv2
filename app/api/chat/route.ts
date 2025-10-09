import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context, todoist_token } = await req.json()

    // 🧩 Walidacja wiadomości
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Nieprawidłowa wiadomość — oczekiwano tekstu.' },
        { status: 400 }
      )
    }

    // 🧩 Komendy związane z Todoist
    const taskKeywords = ['zadania', 'taski', 'lista', 'na dziś', 'na dzis', 'co mam dziś', 'co mam dzis']

    if (taskKeywords.some(k => message.toLowerCase().includes(k))) {
      if (!todoist_token) {
        console.error('❌ Brak tokena Todoist!')
        return NextResponse.json({
          reply: 'Nie udało się pobrać zadań — brak tokena Todoist 😞',
          type: 'error',
        })
      }

      try {
        console.log('🔑 Używam tokena Todoist:', todoist_token.slice(0, 8) + '...')

        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${todoist_token}` },
          cache: 'no-store',
        })

        // 🧾 Logujemy odpowiedź Todoista — kluczowy krok diagnostyczny
        const rawText = await res.text()
        console.log('🪪 Todoist fetch result:', res.status, rawText)

        if (!res.ok) {
          throw new Error(`Błąd Todoist API: ${res.status}`)
        }

        // 🔄 Spróbuj sparsować JSON dopiero po logowaniu
        const tasks = JSON.parse(rawText)
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
          reply: 'Oto Twoje zadania na dziś:',
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

    // 🧠 Klient OpenAI
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = [
      'Jesteś asystentem produktywności, który pomaga użytkownikowi wykonać zadania krok po kroku.',
      'Zadawaj pytania pomocnicze, jeśli coś jest niejasne.',
      'Zawsze odpowiadaj po polsku, jasno i konkretnie.',
      context ? `Kontekst: ${context}` : '',
    ]
      .filter(Boolean)
      .join('\n')

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
