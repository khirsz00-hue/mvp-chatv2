import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    console.log('📩 Wiadomość użytkownika:', message)

    // 🔍 1. Spróbuj pobrać token automatycznie z endpointu /api/todoist/projects
    let token: string | null = null
    try {
      const projectsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/todoist/projects`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })
      const text = await projectsRes.text()
      console.log('🔍 Wynik sprawdzenia /api/todoist/projects:', projectsRes.status, text.slice(0, 100))
      if (projectsRes.ok) {
        token = 'OK' // oznacza, że token działa, więc można odpytac Todoist
      }
    } catch (err) {
      console.warn('⚠️ Nie udało się sprawdzić /api/todoist/projects:', err)
    }

    // 🔍 2. Sprawdź, czy użytkownik pyta o zadania
    const lower = message.toLowerCase()
    const taskQuery = ['zadania', 'taski', 'lista', 'na dziś', 'na dzis', 'co mam dziś', 'co mam dzis']
    const isTaskQuery = taskQuery.some(k => lower.includes(k))

    if (isTaskQuery) {
      if (!token) {
        return NextResponse.json({
          reply: '❌ Nie znaleziono tokena Todoist – zaloguj się ponownie w Todoist Helper.',
          type: 'error',
        })
      }

      try {
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          headers: {
            Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}`,
          },
          cache: 'no-store',
        })

        const text = await res.text()
        console.log('🧾 Odpowiedź Todoist:', res.status, text.slice(0, 120))

        if (!res.ok) throw new Error(`Błąd Todoist API: ${res.status}`)

        const tasks = JSON.parse(text)
        const today = new Date().toISOString().split('T')[0]
        const todays = tasks.filter((t: any) => t.due?.date === today)

        if (!todays.length) {
          return NextResponse.json({
            type: 'tasks',
            reply: 'Nie masz dziś żadnych zadań ✅',
            tasks: [],
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

    // 🧠 3. OpenAI fallback
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `Jesteś asystentem produktywności zintegrowanym z Todoist.`,
        },
        { role: 'user', content: message.trim() },
      ],
    })

    const reply = completion.choices[0]?.message?.content || '⚠️ Brak odpowiedzi.'
    return NextResponse.json({ reply, type: 'text' })
  } catch (err: any) {
    console.error('❌ Błąd /api/chat:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
