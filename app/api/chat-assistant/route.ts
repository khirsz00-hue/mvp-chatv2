/**
 * Chat Assistant API Endpoint
 * Provides AI-powered chat with access to all user data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { fetchChatContext, formatMinimalContextForAI } from '@/lib/services/chatContextService'
import OpenAI from 'openai'

// Initialize OpenAI client only if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  message: string
  conversationHistory?: ChatMessage[]
}

const SYSTEM_PROMPT = `Jesteś AI asystentem ADHD Buddy. 

ZASADY ODPOWIEDZI:
- Maksymalnie 1-2 zdania
- Zero pouczeń ("powinieneś", "sugeruję", "warto")
- Tylko konkretne fakty i liczby
- Format: "{odpowiedź}. {opcjonalny dodatkowy fakt}."

PRZYKŁADY:
User: "Kiedy najlepszy czas na spotkanie?"
AI: "Środa 15:00 - wolny slot, energia 8/10."

User: "Jakie zadania na dziś?"
AI: "8 zadań, 210 min. 3 MUST: mvpPost, Faktury, Pavel Lux."

User: "Jak spałem?"
AI: "Ostatnie 7 dni: 6.2h średnio. Najlepiej: sobota (8h)."

NIE TWÓRZ kolejek zadań - to robi Day Assistant V2.
NIE POUCZAJ jak pracować.`

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Chat Assistant API] Starting request')

    // Authenticate user
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      console.error('❌ [Chat Assistant API] Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`✅ [Chat Assistant API] User authenticated: ${user.id}`)

    // Check if OpenAI is configured
    if (!openai) {
      console.error('❌ [Chat Assistant API] OpenAI API key not configured')
      return NextResponse.json(
        { error: 'Chat assistant is not configured. Please contact administrator.' },
        { status: 503 }
      )
    }

    // Parse request body
    const body: ChatRequest = await request.json()
    const { message, conversationHistory = [] } = body

    // Validate message
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      )
    }

    console.log(`🔍 [Chat Assistant API] Fetching user context for user: ${user.id}`)

    // Fetch user context
    const context = await fetchChatContext(supabase, user.id)
    const contextString = formatMinimalContextForAI(context)

    console.log(`✅ [Chat Assistant API] Context fetched:
- Tasks today: ${context.tasks.today.length}
- Overdue: ${context.tasks.overdue.length}
- Journal entries: ${context.journal.recent.length}
- Active decisions: ${context.decisions.active.length}`)

    // Build messages for OpenAI
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'system',
        content: `DANE UŻYTKOWNIKA:\n${contextString}`,
      },
      ...conversationHistory.slice(-6), // Keep last 6 messages (3 pairs) for context
      {
        role: 'user',
        content: message,
      },
    ]

    console.log(`🔍 [Chat Assistant API] Calling OpenAI with ${messages.length} messages`)

    // Call OpenAI with streaming
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.3,
      max_tokens: 150,
      stream: true,
    })

    console.log(`✅ [Chat Assistant API] Streaming response started`)

    // Create SSE (Server-Sent Events) response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content
            if (text) {
              const data = `data: ${JSON.stringify({ text })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('❌ [Chat Assistant API] Streaming error:', err)
          controller.error(err)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error: any) {
    console.error('❌ [Chat Assistant API] Error:', error)
    
    // Handle OpenAI API errors
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'OpenAI API key invalid or missing' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
