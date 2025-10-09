import { NextResponse } from 'next/server'

// 👇 używamy dynamicznego importu tylko po stronie serwera
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Brak OPENAI_API_KEY w środowisku!')
      return NextResponse.json(
        { error: 'Brak konfiguracji OpenAI API Key.' },
        { status: 500 }
      )
    }

    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = `
Jesteś asystentem produktywności, który pomaga użytkownikowi zrozumieć i wykonać zadanie.
Zawsze pytaj o szczegóły, jeśli coś nie jest jasne, i odpowiadaj praktycznie.
${context ? `Kontekst zadania: ${context}` : ''}
    `.trim()

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    })

    const reply = completion.choices[0]?.message?.content ?? 'Brak odpowiedzi.'
    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('❌ Błąd w /api/chat:', error)
    return NextResponse.json(
      { error: error.message || 'Wewnętrzny błąd serwera' },
      { status: 500 }
    )
  }
}
