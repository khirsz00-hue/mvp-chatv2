import { NextResponse } from 'next/server'

// ✅ Uruchamiamy tylko po stronie serwera
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json()

    // 🧩 Walidacja wejścia
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nieprawidłowa wiadomość — oczekiwano tekstu.' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Brak OPENAI_API_KEY w środowisku!')
      return NextResponse.json(
        { error: 'Brak konfiguracji OpenAI API Key.' },
        { status: 500 }
      )
    }

    // ✅ Dynamiczny import klienta OpenAI
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // 💬 Budujemy kontekstowy prompt
    const systemPrompt = [
      'Jesteś asystentem produktywności, który pomaga użytkownikowi wykonać zadanie.',
      'Zawsze pytaj o szczegóły, jeśli coś nie jest jasne, i odpowiadaj praktycznie, zwięźle i po polsku.',
      context ? `Kontekst zadania: ${context}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    // 🧠 Wywołanie modelu OpenAI
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
      'Brak odpowiedzi od modelu.'

    // ✅ Zwracamy poprawną odpowiedź
    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('❌ Błąd w /api/chat:', error)

    return NextResponse.json(
      {
        error:
          error?.response?.data?.error?.message ||
          error.message ||
          'Wewnętrzny błąd serwera przy komunikacji z OpenAI.',
      },
      { status: 500 }
    )
  }
}
