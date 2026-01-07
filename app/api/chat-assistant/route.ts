/**
 * Chat Assistant API Endpoint
 * Provides AI-powered chat with access to all user data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { fetchChatContext, formatContextForAI } from '@/lib/services/chatContextService'
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

const SYSTEM_PROMPT = `Jesteś AI asystentem pomagającym użytkownikowi z ADHD w zarządzaniu zadaniami, czasem i decyzjami.

TWOJA ROLA:
- Pomagasz użytkownikowi organizować zadania i priorytety
- Sugerujesz optymalne podejście do pracy na podstawie energii i obciążenia
- Analizujesz wzorce zachowań i pomagasz je poprawić
- Wspierasz w podejmowaniu decyzji
- Odpowiadasz w języku polskim

ZASADY:
- Bądź zwięzły ale pomocny
- Sugeruj konkretne akcje
- Uwzględniaj cognitive load zadań
- Priorytetyzuj zadania MUST
- Dostosowuj odpowiedzi do poziomu energii użytkownika
- Używaj emotikonów dla lepszej komunikacji 😊
- Jeśli nie masz danych do odpowiedzi, powiedz to wprost

FORMAT ODPOWIEDZI:
- Krótkie akapity (2-3 zdania max)
- Listy punktowe dla przejrzystości
- Konkretne rekomendacje z czasem (np. "Zacznij od X, zajmie 30 min")

PRZYKŁADY:
User: "Co mam dziś zrobić?"
AI: "Masz 3 zadania MUST na dziś (łącznie 90 minut). Twoja energia z dziennika to 7/10, więc polecam:
1. Zacznij od [zadanie najważniejsze] - 30 min
2. Później [zadanie drugie] - 45 min  
3. Na koniec [zadanie trzecie] - 15 min

Zostaw trudne zadania na poranek gdy masz więcej energii! 💪"

User: "Czy mam czas na nowe zadanie?"
AI: "Sprawdźmy 🤔
- Już masz: 4h zaplanowanych zadań
- Dzień pracy: ~8h
- Zostało: ~4h
Tak, masz czas! Ale pamiętaj o przerwach. Ile czasu zajmie nowe zadanie?"`

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
    const contextString = formatContextForAI(context)

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
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: message,
      },
    ]

    console.log(`🔍 [Chat Assistant API] Calling OpenAI with ${messages.length} messages`)

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 500,
    })

    const assistantMessage = completion.choices[0]?.message?.content

    if (!assistantMessage) {
      console.error('❌ [Chat Assistant API] No response from OpenAI')
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: 500 }
      )
    }

    console.log(`✅ [Chat Assistant API] OpenAI response received (${assistantMessage.length} chars)`)

    return NextResponse.json({
      message: assistantMessage,
      context_summary: {
        tasks_today: context.tasks.today.length,
        must_tasks: context.tasks.today.filter(t => t.is_must).length,
        overdue: context.tasks.overdue.length,
        avg_energy: context.journal.stats.avg_energy,
      },
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
