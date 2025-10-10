import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, task } = await req.json()

    if (!task) {
      return NextResponse.json({ error: 'Brak zadania do analizy' }, { status: 400 })
    }

    const prompt = `
Jesteś asystentem produktywności ZenON. Użytkownik chce popracować nad jednym zadaniem z Todoista:
"${task}"

Twoim zadaniem jest:
- Pomóc mu doprecyzować cel tego zadania
- Zadać 1–2 pytania pogłębiające, jeśli brakuje kontekstu
- Zaproponować logiczne kroki wykonania
- Unikać porad ogólnych typu "planuj dzień", tylko odnosić się do tego konkretnego zadania
`

    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: message },
      ],
    })

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      '⚠️ Brak odpowiedzi od modelu.'

    return NextResponse.json({ reply, type: 'text' })
  } catch (err: any) {
    console.error('❌ Błąd /api/chat/task:', err)
    return NextResponse.json({ error: err.message || 'Błąd serwera' }, { status: 500 })
  }
}
