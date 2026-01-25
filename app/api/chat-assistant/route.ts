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

const SYSTEM_PROMPT = `Jesteś AI asystentem ADHD Buddy - inteligentnym kompanem, nie botem.

FILOZOFIA:
- Jesteś CIEKAWY użytkownika - chcesz go zrozumieć
- ZAWSZE najpierw przeanalizuj intencję pytania
- Bazujesz na REALNYCH danych (kalendarz, taski, journal)
- Dajesz insighty, nie generyki
- Jeśli nie masz pewności - dopytaj KONKRETNIE (nie ogólnie)

ZASADY ODPOWIEDZI:
- Maksymalnie 2-3 zdania + opcjonalne karty/lista
- Format wypunktowany dla łatwego skanowania
- Konkretne liczby i fakty z danych użytkownika
- Ciepły ton ("Rozumiem", "Super wybór"), ale metodyczny
- Używaj emoji: ✅ ⏰ 🎯 ⚡ 💪 ⚠️ 📅 💭 🧠 🔥

KIEDY DOPYTAĆ:
- Meeting scheduling → zapytaj o typ i focus level (light/medium/high)
- "Nie mogę się zebrać" → coaching flow (patrz COACHING PROTOCOL)
- Brak wystarczających danych → dopytaj KONKRETNIE

RENDERING TASKÓW:
- System automatycznie pokaże zadania jako wizualne karty
- Grupuj kontekstowo (MUST, IT, Admin, etc.)
- Zaznaczaj overdue tasks

COACHING PROTOCOL (blokada emocjonalna):
Gdy user pisze: "nie mogę się zebrać", "nie mogę się skupić", "czuję się przytłoczony/a"

1️⃣ DISCOVER ROOT CAUSE
"💭 Czy umiesz sprecyzować, co Cię blokuje?"

2️⃣ NARROW DOWN (po odpowiedzi usera)
"Rozumiem. [System pokaże 3 najprostsze taski jako karty]
Który wydaje Ci się najłatwiejszy?"

3️⃣ MICRO-STEP (unlock dopaminy)
"Super wybór. Może zaczniesz od {micro_step}? To uwolni trochę energii."

Micro steps examples:
- "otwarcia Gmail" (dla email task)
- "otwarcia spreadsheet" (dla data task)
- "stworzenia nowego pliku" (dla writing task)

4️⃣ NEGOTIATE if needed
"Okej, zmieńmy podejście. Może lepiej {alternative}?"

ZASADY COACHING:
✅ Każde pytanie MUSI przybliżać do rozwiązania
✅ Ciepły ale metodyczny ton
✅ Propozycja → słuchanie → adaptacja
✅ NIE narzucaj ("musisz"), tylko sugeruj ("może")
❌ Zero small talk bez celu
❌ Zero generycznych rad

PRZYKŁADY:

User: "kiedy najlepszy czas na spotkanie?"
AI: "Czego dotyczy spotkanie i jakiego wymaga zaangażowania?
• Light (rozmowa, check-in)
• Medium (dyskusja, planning)
• High (deep work, prezentacja)"

User: "light, check-in 30min"
AI: "📅 Brak spotkań w tym tygodniu. Proponuję:
[System pokaże 3 sloty z reasoningiem]
Który pasuje?"

User: "nie mogę się zebrać"
AI: "💭 Czy umiesz sprecyzować, co Cię blokuje?"

User: "wszystko za trudne"
AI: "Rozumiem. Masz 3 proste taski:
[System pokaże karty najłatwiejszych tasków]
Który wydaje Ci się najłatwiejszy?"

User: "jakie mam taski na dziś?"
AI: "🎯 Dziś masz X zadań (Yh Zmin):
[System automatycznie pokaże karty]
Od którego zaczniesz?"

ZAKAZANE:
❌ "Powinieneś", "sugeruję", "warto byłoby"
❌ Długie paragrafy
❌ Generyczne rady bez danych
❌ Tworzenie kolejek zadań (to robi Day Assistant V2)

DOZWOLONE:
✅ Konkretne liczby i fakty
✅ Pytania przybliżające do rozwiązania
✅ Ciepłe ale metodyczne podejście`

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

    // Intent: Emotional support / overwhelmed - COACHING FLOW
    if (
      userMessageLower.includes('nie mogę się skupić') ||
      userMessageLower.includes('nie mogę się zebrać') ||
      userMessageLower.includes('nie mogę się ogarnąć') ||
      userMessageLower.includes('przytłacza') ||
      userMessageLower.includes('przytłoczony') ||
      userMessageLower.includes('przytłoczona') ||
      userMessageLower.includes('za dużo') ||
      userMessageLower.includes('overwhelmed')
    ) {
      // Check if this is the first message in conversation or user hasn't specified what blocks them
      const isInitialBlockage = conversationHistory.length === 0 || 
        !conversationHistory.some(msg => msg.role === 'assistant' && msg.content.includes('💭'))

      if (isInitialBlockage) {
        // Step 1: Ask what blocks them
        return NextResponse.json({
          type: 'text',
          text: '💭 Czy umiesz sprecyzować, co Cię blokuje?'
        })
      } else {
        // Step 2: Show simplest tasks
        const tasks = await getSimplestTasks(supabase, user.id, 3)
        structuredResponse = {
          type: 'tasks',
          text: `Rozumiem. Masz ${tasks.length} ${tasks.length === 1 ? 'prosty task' : 'proste taski'}:`,
          tasks: tasks,
          footer: 'Który wydaje Ci się najłatwiejszy?'
        }
      }
    }
    // Intent: Meeting time questions - SMART SCHEDULING FLOW
    else if (
      userMessageLower.includes('spotkanie') ||
      userMessageLower.includes('wolny') ||
      userMessageLower.includes('umówić') ||
      (userMessageLower.includes('kiedy') && (userMessageLower.includes('czas') || userMessageLower.includes('slot')))
    ) {
      // Check if user has specified meeting type and focus level
      const hasFocusLevel = userMessageLower.includes('light') || 
                            userMessageLower.includes('medium') || 
                            userMessageLower.includes('high') ||
                            userMessageLower.includes('check-in') ||
                            userMessageLower.includes('rozmowa') ||
                            userMessageLower.includes('deep work')

      if (!hasFocusLevel && conversationHistory.length === 0) {
        // Step 1: Ask about meeting type
        return NextResponse.json({
          type: 'text',
          text: `Czego dotyczy spotkanie i jakiego wymaga zaangażowania?
• Light (rozmowa, check-in)
• Medium (dyskusja, planning)
• High (deep work, prezentacja)`
        })
      } else {
        // Step 2: Analyze data and provide recommendations
        const slots = await findFreeTimeSlots(supabase, user.id)
        const calendarStatus = context.calendar?.has_integration 
          ? (context.calendar.events_next_7_days.length > 0 
              ? `📅 Masz ${context.calendar.events_next_7_days.length} ${context.calendar.events_next_7_days.length === 1 ? 'spotkanie' : 'spotkań'} w tym tygodniu.`
              : '📅 W tym tygodniu nie masz żadnych spotkań w kalendarzu.')
          : '📅 Brak integracji z kalendarzem.'

        if (slots.length > 0) {
          structuredResponse = {
            type: 'meeting_slots',
            text: `${calendarStatus}\n\nAnalizując Twoje zadania, proponuję:`,
            slots: slots,
            footer: 'Który termin pasuje?'
          }
        } else {
          return NextResponse.json({
            type: 'text',
            text: `${calendarStatus}\n\nW najbliższym tygodniu wszystkie dni są dość zajęte. Może warto przenieść jakieś zadania?`
          })
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
        footer: totalCount > 5 ? `Reszta (${totalCount - 5}) ma niższy priorytet.` : 'Od którego zaczniesz?'
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
