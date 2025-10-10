import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, task } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Brak wiadomości' }, { status: 400 })
    }

    console.log('💬 Wiadomość do AI Task Chat:', message)
    console.log('🧩 Kontekst zadania:', task)

    // 🧠 OpenAI – osobny, lekki kontekst tylko dla tasków
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const systemPrompt = `
Jesteś asystentem produktywności pracującym z pojedynczym zadaniem użytkownika w Todoist.
Twoim celem jest pomóc użytkownikowi:
- rozłożyć zadanie na mniejsze kroki,
- zaplanować kolejne działania,
- znaleźć blokery i sposoby ich rozwiązania,
- zsyntetyzować najważniejsze decyzje.

Nie udzielaj motywacyjnych tekstów. Bądź konkretny, praktyczny i rzeczowy.
Zawsze pisz po polsku.
    `.trim()

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Zadanie: ${task || '(brak opisu)'}\n\nPytanie: ${message}`,
        },
      ],
    })

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      '⚠️ Brak odpowiedzi od AI.'

    return NextResponse.json({ reply, type: 'text' })
  } catch (err: any) {
    console.error('❌ Błąd w /api/chat/task:', err)
    return NextResponse.json(
      { error: err.message || 'Nieoczekiwany błąd serwera' },
      { status: 500 }
    )
  }
}
