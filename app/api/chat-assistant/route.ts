/**
 * Chat Assistant API Endpoint
 * Provides AI-powered chat with access to all user data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { 
  fetchChatContext, 
  formatMinimalContextForAI,
  findFreeTimeSlots,
  getOverdueTasks,
  getTodayTasks,
  getSimplestTasks,
  TaskContext
} from '@/lib/services/chatContextService'
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

interface StructuredResponse {
  type: 'tasks' | 'meeting_slots' | 'text'
  text: string
  tasks?: TaskContext[]
  slots?: Array<{ time: string; duration: number; energyLevel?: number }>
  footer?: string
}

const SYSTEM_PROMPT = `Jesteś asystentem ADHD. Komunikuj się zgodnie z tymi zasadami:

STYL ODPOWIEDZI:
- Maksymalnie 2-3 krótkie zdania
- Używaj wypunktowań i emoji (✅ ⏰ 🎯 ⚡ 💪 ⚠️)
- ZERO pouczeń typu "powinieneś", "warto byłoby", "sugeruję"
- Tylko konkretne fakty i liczby
- Akcent na TO CO TERAZ, nie na przyszłość

PRZYKŁADY DOBRYCH ODPOWIEDZI:

User: "Kiedy najlepszy czas na spotkanie?"
AI: "✅ Najbliższe wolne:
• Środa 15:00-16:00 (energia 8/10)
• Czwartek 10:00-11:30 (najlepszy focus)
Która opcja?"

User: "Jakie mam zadania na dziś?"
AI: "🎯 Dziś masz 6 zadań (3h 20min):
[Pokaż jako karty - system to obsłuży]
Reszta (3) ma niższy priorytet."

User: "Nie mogę się skupić"
AI: "💪 Rozumiem. Wybierz JEDNO:
[Pokaż najprostsze zadania jako karty]
Od którego zaczynasz?"

User: "Jakie mam przeterminowane?"
AI: "⚠️ 4 przeterminowane (łącznie 2h 15min):
[Pokaż jako karty]
Które jako pierwsze?"

ZAKAZANE FORMUŁOWANIA:
❌ "Powinieneś zacząć od..."
❌ "Sugerowałbym, aby..."
❌ "Warto byłoby..."
❌ "Proponuję następujące kroki..."
❌ Długie paragrafy

DOZWOLONE:
✅ "Masz X zadań"
✅ "Najlepszy czas: ..."
✅ "Od którego zaczynasz?"
✅ Wypunktowania
✅ Karty zadań (automatycznie dodane przez system)`

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

    // Detect user intent and prepare structured response if needed
    const userMessageLower = message.toLowerCase()
    let structuredResponse: StructuredResponse | null = null

    // Intent: Meeting time questions
    if (
      userMessageLower.includes('spotkanie') ||
      userMessageLower.includes('wolny') ||
      userMessageLower.includes('umówić') ||
      (userMessageLower.includes('kiedy') && (userMessageLower.includes('czas') || userMessageLower.includes('slot')))
    ) {
      const slots = await findFreeTimeSlots(supabase, user.id)
      if (slots.length > 0) {
        structuredResponse = {
          type: 'meeting_slots',
          text: `✅ Najbliższe wolne sloty:`,
          slots: slots
        }
      }
    }
    // Intent: Tasks today
    else if (
      (userMessageLower.includes('zadania') || userMessageLower.includes('task') || userMessageLower.includes('co')) &&
      (userMessageLower.includes('dziś') || userMessageLower.includes('dzisiaj') || userMessageLower.includes('today'))
    ) {
      const tasks = await getTodayTasks(supabase, user.id, 5)
      const totalTime = tasks.reduce((sum, t) => sum + t.estimate_min, 0)
      const totalCount = context.tasks.today.length
      structuredResponse = {
        type: 'tasks',
        text: `🎯 Dziś masz ${totalCount} ${totalCount === 1 ? 'zadanie' : totalCount < 5 ? 'zadania' : 'zadań'} (${Math.floor(totalTime / 60)}h ${totalTime % 60}min):`,
        tasks: tasks,
        footer: totalCount > 5 ? `Reszta (${totalCount - 5}) ma niższy priorytet.` : undefined
      }
    }
    // Intent: Overdue tasks
    else if (
      (userMessageLower.includes('przeterminowane') || userMessageLower.includes('overdue') || userMessageLower.includes('spóźnione')) ||
      (userMessageLower.includes('jakie') && userMessageLower.includes('zaległe'))
    ) {
      const tasks = await getOverdueTasks(supabase, user.id, 5)
      const totalTime = tasks.reduce((sum, t) => sum + t.estimate_min, 0)
      structuredResponse = {
        type: 'tasks',
        text: `⚠️ ${tasks.length} ${tasks.length === 1 ? 'przeterminowane' : 'przeterminowanych'} (łącznie ${Math.floor(totalTime / 60)}h ${totalTime % 60}min):`,
        tasks: tasks,
        footer: 'Które jako pierwsze?'
      }
    }
    // Intent: Emotional support / overwhelmed
    else if (
      userMessageLower.includes('nie mogę się skupić') ||
      userMessageLower.includes('nie mogę się ogarnąć') ||
      userMessageLower.includes('przytłacza') ||
      userMessageLower.includes('za dużo') ||
      userMessageLower.includes('overwhelmed')
    ) {
      const tasks = await getSimplestTasks(supabase, user.id, 3)
      structuredResponse = {
        type: 'tasks',
        text: `💪 Rozumiem. Wybierz JEDNO:`,
        tasks: tasks,
        footer: 'Od którego zaczynasz?'
      }
    }

    // If we have structured response, return it immediately without calling OpenAI
    if (structuredResponse) {
      console.log(`✅ [Chat Assistant API] Returning structured response: ${structuredResponse.type}`)
      
      return NextResponse.json(structuredResponse)
    }

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
