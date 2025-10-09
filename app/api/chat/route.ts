import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const todoist_token = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null

    const { message, context } = await req.json().catch(() => ({}))

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Brak wiadomości.' }, { status: 400 })
    }

    const taskKeywords = ['zadania', 'taski', 'lista', 'na dziś', 'na dzis', 'co mam dziś', 'co mam dzis']

    // --- OBSŁUGA TODOIST ---
    if (taskKeywords.some(k => message.toLowerCase().includes(k))) {
      if (!todoist_token) {
        console.error('❌ Brak tokena Todoist!')
        return NextResponse.json({
          reply: 'Brak tokena Todoist — zaloguj się w Todoist Helper 🔒',
          type: 'error',
        })
      }

      try {
        console.log('🔑 Używam tokena Todoist (z nagłówka):', todoist_token.slice(0, 8) + '...')
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${todoist_token}` },
          cache: 'no-store',
        })

        const raw = await res.text()
        console.log('🪪 Todoist API odpowiedź:', res.status, raw)

        if (!res.ok) throw new Error(`Błąd Todoist API: ${res.status}`)
        const tasks = JSON.parse(raw)

        const today = new Date().toISOString().split('T')[0]
        const todays = tasks.filter((t: any) => t.due?.date === today)

        if (todays.length === 0)
          return NextResponse.json({
            type: 'tasks',
            tasks: [],
            reply: 'Nie masz dziś żadnych zaplanowanych zadań ✅',
          })

        return NextResponse.json({
          type: 'tasks',
          reply: 'Oto Twoje zadania na dziś:',
          tasks: todays.map((t: any) => ({
            id: t.id,
            content: t.content,
            due: t.due?.date,
            priority: t.priority,
          })),
        })
      } catch (err) {
        console.error('❌ Błąd Todoist:', err)
        return NextResponse.json({
          reply: 'Nie udało się pobrać zadań z Todoista 😞',
          type: 'error',
        })
      }
    }

    // --- OBSŁUGA OPENAI ---
    if (!process.env.OPENAI_API_KEY)
      return NextResponse.json({ error: 'Brak OpenAI API key' }, { status: 500 })

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
      completion.choices?.[0]?.message?.content?.trim() || '⚠️ Brak odpowiedzi od modelu.'

    return NextResponse.json({ reply, type: 'text' })
  } catch (error: any) {
    console.error('❌ Błąd w /api/chat:', error)
    return NextResponse.json({ error: error.message || 'Błąd serwera.' }, { status: 500 })
  }
}
