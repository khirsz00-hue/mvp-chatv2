import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context, todoist_token } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    // 🔑 1. TOKEN
    const token = todoist_token || process.env.TODOIST_API_TOKEN
    console.log('🔑 Odebrany token Todoist:', token ? token.slice(0, 10) + '...' : '❌ brak')

    // 🔍 2. Wykrywanie zapytań o zadania
    const taskKeywords = ['zadania', 'taski', 'lista', 'na dziś', 'na dzis', 'co mam dziś', 'co mam dzis']
    const lower = message.toLowerCase()
    const isTaskQuery = taskKeywords.some(k => lower.includes(k))

    if (isTaskQuery) {
      if (!token) {
        return NextResponse.json({
          reply: 'Brak tokena Todoist — zaloguj się w Todoist Helper 🔒',
          type: 'error',
        })
      }

      try {
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })

        const text = await res.text()
        console.log('🪪 Odpowiedź Todoist API:', res.status, text.slice(0, 120))

        if (!res.ok) throw new Error(`Błąd Todoist API: ${res.status}`)

        const tasks = JSON.parse(text)
        const today = new Date().toISOString().split('T')[0]
        const todays = tasks.filter((t: any) => t.due?.date === today)

        if (!todays.length) {
          return NextResponse.json({
            type: 'tasks',
            tasks: [],
            reply: 'Nie masz dziś żadnych zaplanowanych zadań ✅',
          })
        }

        return NextResponse.json({
          type: 'tasks',
          reply: '🗓️ Twoje zadania na dziś:',
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
          type: 'error',
          reply: 'Nie udało się pobrać zadań z Todoista 😞',
        })
      }
    }

    // 🧠 3. Fallback – OpenAI
    if (!process.env.OPENAI_API_KEY)
      throw new Error('Brak OPENAI_API_KEY w środowisku.')

    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = [
      'Jesteś asystentem produktywności połączonym z Todoist.',
      'Pomagasz w organizacji dnia, zadaniach i planowaniu.',
      'Zawsze odpowiadaj po polsku, krótko i jasno.',
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

    const reply = completion.choices[0]?.message?.content?.trim() || '⚠️ Brak odpowiedzi.'
    return NextResponse.json({ reply, type: 'text' })
  } catch (err: any) {
    console.error('❌ Błąd /api/chat:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
