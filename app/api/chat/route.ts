import { NextResponse } from 'next/server'

// ✅ Działa tylko po stronie serwera (nie w Edge)
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json()

    // 🧩 Walidacja wejścia
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Nieprawidłowa wiadomość — oczekiwano tekstu.' },
        { status: 400 }
      )
    }

    // 🧩 Sprawdzenie API keya
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Brak OPENAI_API_KEY w środowisku!')
      return NextResponse.json(
        { error: 'Brak konfiguracji OpenAI API Key.' },
        { status: 500 }
      )
    }

    // 🧠 Dynamiczny import klienta OpenAI
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // 💬 Kontekstowy system prompt
    const systemPrompt = [
      'Jesteś asystentem produktywności, który pomaga użytkownikowi wykonać zadanie krok po kroku.',
      'Zadawaj pytania pomocnicze, jeśli coś jest niejasne.',
      'Zawsze odpowiadaj po polsku, jasno i konkretnie.',
      context ? `Kontekst zadania: ${context}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    // 🔮 Wywołanie modelu
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.trim() },
      ],
    })

    // 🧾 Odczyt odpowiedzi modelu
    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      '⚠️ Brak odpowiedzi od modelu.'

    // ✅ Sukces
    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('❌ Błąd w /api/chat:', error)

    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Nieoczekiwany błąd serwera.'

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
