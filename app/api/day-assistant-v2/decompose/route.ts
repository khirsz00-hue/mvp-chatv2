/**
 * API Route: /api/day-assistant-v2/decompose
 * POST: Decompose task into smaller subtasks using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Configuration constants
const OPENAI_API_TIMEOUT_MS = 15000 // 15 seconds
const DEFAULT_RETRY_ATTEMPTS = 3
const RETRY_INITIAL_DELAY_MS = 1000 // 1 second

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = DEFAULT_RETRY_ATTEMPTS,
  initialDelayMs: number = RETRY_INITIAL_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 [Decompose] Attempt ${attempt}/${retries}`)
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`❌ [Decompose] Attempt ${attempt}/${retries} failed:`, lastError.message)
      
      // Don't wait after the last attempt
      if (attempt < retries) {
        const delayMs = Math.min(initialDelayMs * Math.pow(2, attempt - 1), 5000)
        console.log(`⏳ [Decompose] Waiting ${delayMs}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed')
}

// Fallback steps generator
function generateFallbackSteps(taskTitle: string): Array<{title: string; estimated_minutes: number; order: number}> {
  return [
    {
      title: "Przeanalizuj dokładnie wymagania zadania",
      estimated_minutes: 10,
      order: 1
    },
    {
      title: "Zidentyfikuj niezbędne zasoby i narzędzia",
      estimated_minutes: 10,
      order: 2
    },
    {
      title: "Zacznij od najprostszego kroku w kierunku realizacji",
      estimated_minutes: 15,
      order: 3
    }
  ]
}

export async function POST(request: NextRequest) {
  // Store task_title at function scope for error handling
  let taskTitle = 'Zadanie'
  
  try {
    console.log('🔍 [Decompose] Starting task decomposition request')
    
    const { task_title, what_to_do, completion_criteria, blockers } = await request.json()
    
    // Store for later use in catch block
    taskTitle = task_title || 'Zadanie'

    if (!task_title || !what_to_do || !completion_criteria) {
      console.error('❌ [Decompose] Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('🔍 [Decompose] Task:', task_title)
    console.log('🔍 [Decompose] What to do length:', what_to_do.length)
    console.log('🔍 [Decompose] Completion criteria length:', completion_criteria.length)

    // Initialize OpenAI client at runtime
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [Decompose] OpenAI API key not configured')
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const prompt = `
Zadanie: "${task_title}"

Kontekst od użytkownika:
- Co trzeba zrobić: ${what_to_do}
- Kryteria ukończenia: ${completion_criteria}
${blockers ? `- Blokery/zależności: ${blockers}` : ''}

Na podstawie tego kontekstu zaproponuj 3-5 konkretnych kroków do wykonania.
Każdy krok powinien być:
- Konkretny i wykonalny
- Mieć realny szacunek czasu (5-60 min)
- Prowadzić do ukończenia zadania

Odpowiedz w formacie JSON:
{
  "steps": [
    {
      "title": "Konkretny krok do wykonania",
      "estimated_minutes": 15,
      "order": 1
    }
  ]
}
`

    console.log('🔍 [Decompose] Calling OpenAI API...')
    
    // Call OpenAI with retry and timeout
    const result = await retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Use turbo model that supports json_object
        messages: [
          {
            role: 'system',
            content: 'Jesteś ekspertem w dekompozycji zadań na małe, wykonalne kroki. Zawsze odpowiadasz w formacie JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.7
      }, {
        timeout: OPENAI_API_TIMEOUT_MS
      })

      // Parse JSON and validate - catch JSON errors separately
      try {
        const parsedResult = JSON.parse(completion.choices[0].message.content || '{}')
        return parsedResult
      } catch (parseError) {
        console.error('❌ [Decompose] Failed to parse OpenAI response as JSON:', parseError)
        throw new Error('Invalid JSON response from AI')
      }
    }, DEFAULT_RETRY_ATTEMPTS, RETRY_INITIAL_DELAY_MS) // 3 retries with exponential backoff

    console.log('✅ [Decompose] OpenAI API call successful')
    console.log('🔍 [Decompose] Generated', result.steps?.length || 0, 'steps')

    // Validate and return steps
    if (!result.steps || !Array.isArray(result.steps) || result.steps.length === 0) {
      console.warn('⚠️ [Decompose] No steps generated by AI - using fallback')
      const fallbackSteps = generateFallbackSteps(task_title)
      return NextResponse.json({ 
        steps: fallbackSteps,
        warning: 'AI nie wygenerował kroków - użyto szablonu podstawowego'
      })
    }

    return NextResponse.json({ steps: result.steps })
    
  } catch (error) {
    console.error('❌ [Decompose] Error:', error)
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to generate steps'
    let statusCode = 500
    
    if (error instanceof Error) {
      console.error('❌ [Decompose] Error name:', error.name)
      console.error('❌ [Decompose] Error message:', error.message)
      console.error('❌ [Decompose] Error stack:', error.stack)
      
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Przekroczono limit czasu - spróbuj z krótszym opisem'
        statusCode = 408
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        errorMessage = 'Błąd API - sprawdź token AI'
        statusCode = 401
      } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Błąd połączenia z AI - spróbuj ponownie'
        statusCode = 503
      }
    }
    
    // Return fallback steps even on error
    const fallbackSteps = generateFallbackSteps(taskTitle)
    
    return NextResponse.json({ 
      error: errorMessage,
      steps: fallbackSteps,
      warning: 'Wystąpił błąd AI - użyto kroków podstawowych'
    }, { status: statusCode })
  }
}
