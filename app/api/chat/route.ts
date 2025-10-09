import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { message, context } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Brak wiadomości w żądaniu.' },
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

    const systemPrompt = `
Jesteś asystentem produktywności, który pomaga w realizacji zadań.
Zawsze pytaj o szczegóły i doradzaj rzeczowo, nie wymyślaj danych.
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
