import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    console.log('📩 Wiadomość użytkownika:', message)
    if (context) console.log('🧠 Otrzymano kontekst z frontendu (Todoist):', context.slice(0, 200))

    // 🧠 Przygotuj prompt z kontekstem
    const prompt = context
      ? `Użytkownik ma obecnie takie zadania w Todoist:\n${context}\n\nNa podstawie powyższej listy odpowiedz na wiadomość użytkownika:\n"${message}"`
      : message

    // 🧩 Połączenie z OpenAI
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `Jesteś inteligentnym asystentem produktywności ZenON. 
Twoim zadaniem jest pomagać użytkownikowi analizować jego listę zadań z Todoista, 
grupować je tematycznie, ustalać priorytety, tworzyć plan dnia i pomagać w koncentracji.
Zawsze odpowiadaj po polsku, jasno i konkretnie.`,
        },
        { role: 'user', content: prompt.trim() },
      ],
    })

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      '⚠️ Brak odpowiedzi od modelu.'

    return NextResponse.json({ reply, type: 'text' })
  } catch (err: any) {
    console.error('❌ Błąd /api/chat:', err)
    return NextResponse.json({ error: err.message || 'Nieznany błąd serwera' }, { status: 500 })
  }
}
