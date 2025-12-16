import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { getOpenAIClient } from '@/lib/openai'
import { validateUUID } from '@/lib/validation/uuid'

// Mark as dynamic route since we use request.url
export const dynamic = 'force-dynamic'

// Chat intent types
type ChatIntent = 
  | 'SCHEDULE_SLOT'
  | 'WHAT_NOW'
  | 'I_AM_STUCK'
  | 'FLOW_MODE'
  | 'MEGA_IMPORTANT'
  | 'BREAKDOWN_TASK'
  | 'MOVE_TASK'
  | 'GROUP_TASKS'
  | 'STATUS_UPDATE'
  | 'UNKNOWN'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// System prompt for Day Assistant chat
const SYSTEM_PROMPT = `Jesteś Asystentem Dnia - AI pomocnikiem w zarządzaniu zadaniami dzisiaj.

ZASADY:
1. Odpowiadaj krótko i konkretnie (max 2-3 zdania)
2. ZAWSZE proponuj konkretną akcję, nie gadaj tylko
3. Zwracaj JSON z: summary, recommendations[]
4. Recommendations mają type, title, reason, actions[], taskDetails[]
5. WAŻNE: Gdy grupujesz zadania, ZAWSZE wymień konkretne tytuły zadań w "taskDetails"

INTENCJE:
- WHAT_NOW: "co teraz?" → wybierz 1 zadanie + powód
- I_AM_STUCK: "nie idzie", "ciężko" → przełącz na low + małe kroki
- FLOW_MODE: "mam flow", "dobrze idzie" → batching podobnych zadań
- MEGA_IMPORTANT: "to krytyczne dziś" → znajdź slot + przesuń inne
- GROUP_TASKS: "pogrupuj", "podobne" → batching po kontekście, POKAŻ KONKRETNIE które zadania
- SCHEDULE_SLOT: "znajdź czas", "kiedy spotkanie" → 3 sloty
- MOVE_TASK: "przesuń X na..." → reschedule
- BREAKDOWN_TASK: "rozbij", "kroki" → subtaski
- STATUS_UPDATE: "zrobiłem X" → update + co dalej

FORMAT ODPOWIEDZI:
{
  "summary": "1 zdanie podsumowania",
  "recommendations": [
    {
      "id": "rec_1",
      "type": "GROUP_TASKS" | "MOVE_TASK" | "ENERGY_CHANGE" | "SCHEDULE_SLOT" | "SIMPLIFY",
      "title": "Krótki tytuł akcji",
      "reason": "Dlaczego (1 zdanie) - ZAWSZE wspomniej konkretne zadania po tytule",
      "taskDetails": [
        { "taskId": "t1", "title": "Tytuł zadania 1" },
        { "taskId": "t2", "title": "Tytuł zadania 2" }
      ],
      "actions": [
        { "op": "CREATE_BLOCK", "start": "14:00", "durationMin": 60, "taskIds": ["t1","t2"] }
      ]
    }
  ]
}

PRZYKŁAD REKOMENDACJI GRUPOWANIA:
✅ DOBRZE: "Grupowanie emaili: 'Odpowiedź klientowi', 'Newsletter', 'Oferta dla XYZ'"
❌ ŹLE: "Zgrupuj podobne zadania"

Bądź operacyjny, nie teoretyczny. User chce działać, nie czytać esejów. ZAWSZE pokazuj konkretne zadania!`

// Classify intent from user message
function classifyIntent(message: string): ChatIntent {
  const msg = message.toLowerCase()
  
  if (msg.includes('co teraz') || msg.includes('co robić')) return 'WHAT_NOW'
  if (msg.includes('ciężko') || msg.includes('nie idzie') || msg.includes('stuck')) return 'I_AM_STUCK'
  if (msg.includes('flow') || msg.includes('dobrze idzie')) return 'FLOW_MODE'
  if (msg.includes('krytyczne') || msg.includes('pilne') || msg.includes('mega ważne')) return 'MEGA_IMPORTANT'
  if (msg.includes('grupuj') || msg.includes('podobne') || msg.includes('batching')) return 'GROUP_TASKS'
  if (msg.includes('znajdź czas') || msg.includes('kiedy') || msg.includes('spotkanie')) return 'SCHEDULE_SLOT'
  if (msg.includes('przesuń') || msg.includes('zmień czas')) return 'MOVE_TASK'
  if (msg.includes('rozbij') || msg.includes('kroki') || msg.includes('subtask')) return 'BREAKDOWN_TASK'
  if (msg.includes('zrobiłem') || msg.includes('ukończone')) return 'STATUS_UPDATE'
  
  return 'UNKNOWN'
}

// GET: Retrieve chat history for today
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    console.log('🔍 [API Chat GET] Received userId:', userId)

    // Validate userId
    const validationError = validateUUID(userId)
    if (validationError) {
      console.error('❌ [API Chat GET]', validationError)
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Get messages from day_chat_messages table (we'll create this)
    const { data: messages, error } = await supabase
      .from('day_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ [API Chat GET] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ [API Chat GET] Found ${messages?.length || 0} messages`)
    return NextResponse.json({ messages: messages || [] })
  } catch (err: any) {
    console.error('Error in GET /api/day-assistant/chat:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Send message and get AI response
export async function POST(req: Request) {
  try {
    const { userId, message, conversationHistory } = await req.json()

    console.log('🔍 [API Chat POST] Received userId:', userId)

    // Validate userId
    const validationError = validateUUID(userId)
    if (validationError) {
      console.error('❌ [API Chat POST]', validationError)
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    // Classify intent
    const intent = classifyIntent(message)

    // Get current context (tasks, energy mode, calendar)
    const contextData = await getDayContext(userId)

    // Build messages for OpenAI
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `CONTEXT:\n${JSON.stringify(contextData, null, 2)}` }
    ]

    // Add conversation history (last 5 messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-5)
      recentHistory.forEach((msg: ChatMessage) => {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: `${message}\n\nDetected intent: ${intent}`
    })

    // Call OpenAI
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0].message.content || '{}'
    const response = JSON.parse(responseText)

    console.log('✅ [API Chat POST] AI response generated successfully')

    // Save both messages to database
    const today = new Date().toISOString()

    const { error: insertError } = await supabase.from('day_chat_messages').insert([
      {
        user_id: userId,
        role: 'user',
        content: message,
        intent: intent,
        created_at: today
      },
      {
        user_id: userId,
        role: 'assistant',
        content: response.summary || responseText,
        recommendations: response.recommendations || null,
        created_at: new Date(Date.now() + 1000).toISOString()
      }
    ])

    if (insertError) {
      console.error('❌ [API Chat POST] Error saving messages:', insertError)
    } else {
      console.log('✅ [API Chat POST] Messages saved to database')
    }

    return NextResponse.json(response)
  } catch (err: any) {
    console.error('Error in POST /api/day-assistant/chat:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Helper: Get current day context for AI
async function getDayContext(userId: string) {
  try {
    // Get energy mode
    const { data: energyState } = await supabase
      .from('day_assistant_energy_state')
      .select('current_mode')
      .eq('user_id', userId)
      .single()

    // Get NOW/NEXT/LATER tasks with more details
    const { data: tasks } = await supabase
      .from('day_assistant_tasks')
      .select('id, title, description, priority, estimated_duration, is_pinned, is_mega_important')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('priority')
      .order('position')
      .limit(20)

    // Get today's date
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Format tasks with clear structure for AI
    const formattedTasks = (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      duration: t.estimated_duration,
      pinned: t.is_pinned,
      megaImportant: t.is_mega_important
    }))

    return {
      energyMode: energyState?.current_mode || 'normal',
      currentTime: today.toISOString(),
      tasks: formattedTasks,
      taskCount: {
        now: formattedTasks.filter(t => t.priority === 'now').length,
        next: formattedTasks.filter(t => t.priority === 'next').length,
        later: formattedTasks.filter(t => t.priority === 'later').length
      },
      date: todayStr
    }
  } catch (error) {
    console.error('Error getting day context:', error)
    return {
      energyMode: 'normal',
      currentTime: new Date().toISOString(),
      tasks: [],
      date: new Date().toISOString().split('T')[0]
    }
  }
}
