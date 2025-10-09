import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const customToken = req.headers.get('x-todoist-token') // ✅ bezpieczny nagłówek
    const { message, context } = await req.json().catch(() => ({}))

    if (!message || typeof message !== 'string')
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })

    const taskKeywords = ['zadania', 'taski', 'lista', 'na dziś', 'na dzis', 'co mam dziś', 'co mam dzis']

    // === TODOIST ===
    if (taskKeywords.some(k => message.toLowerCase().includes(k))) {
      if (!customToken) {
        console.error('❌ Brak tokena Todoist (x-todoist-token)')
        return NextResponse.json({
          reply: 'Brak tokena Todoist — zaloguj się w Todoist Helper 🔒',
          type: 'error',
        })
      }

      try {
        console.log('🔑 Token Todoist otrzymany:', customToken.slice(0, 8) + '...')
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${customToken}` },
          cache: 'no-store',
        })

        const text = await res.text()
        console.log('🪪 Odpowiedź Todoist:', res.status, text.slice(0, 120))

        if (!res.ok) throw new Error(`Błąd Todoist API: ${res.status}`)
        const tasks = JSON.parse(text)
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

    // === OPENAI ===
    if (!process.env.OPENAI_API_KEY)
      return NextResponse.json({ error: 'Brak OpenAI API key' }, { status: 500 })

    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = [
      'Jesteś asystentem produktywności.',
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
  } catch (err: any) {
    console.error('❌ Błąd /api/chat:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
