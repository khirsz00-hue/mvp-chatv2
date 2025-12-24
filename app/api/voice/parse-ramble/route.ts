/**
 * API Route: /api/voice/parse-ramble
 * POST: Parse continuous voice dictation into structured tasks
 * Handles Polish language commands for task separation, undo, and cancel
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }
  
  return new OpenAI({ apiKey })
}

interface ParsedTask {
  title: string
  due_date: string | null
  estimate_min: number
  context_type: string
}

interface ParseRequest {
  transcript: string
  existingTasks: ParsedTask[]
}

interface ParseResponse {
  action: 'ADD_TASKS' | 'UNDO' | 'CANCEL_ALL'
  tasks: ParsedTask[]
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Parse Ramble API] Request received')

    const body: ParseRequest = await request.json()
    const { transcript, existingTasks } = body

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      )
    }

    console.log('🔍 [Parse Ramble API] Transcript:', transcript.substring(0, 100))
    console.log('🔍 [Parse Ramble API] Existing tasks count:', existingTasks.length)

    const openai = getOpenAIClient()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Jesteś polskim parserem zadań dla ciągłego dyktowania głosowego (Ramble-style).

ZADANIE: Parsuj polską mowę na zadania. Użytkownik rozdziela zadania używając:
- "potem", "następnie", "później", "także", "i" (po dacie)

KOMENDY:
1. UNDO: "cofnij", "anuluj" (sam), "nie to", "usuń ostatni" → usuń ostatnie zadanie
2. CANCEL: "anuluj wszystko", "zapomnij", "stop wszystko" → zamknij bez zapisu

FORMAT WYPOWIEDZI:
"[Nazwa zadania]" + [krótka pauza] + "[termin]"

PRZYKŁAD:
User: "Zadzwonić do klienta jutro, potem napisać raport dzisiaj"

PARSUJ NA:
Task 1: "Zadzwonić do klienta" | jutro
Task 2: "Napisać raport" | dzisiaj

DATY:
- "dzisiaj" → dziś
- "jutro" → jutro
- "pojutrze" → za 2 dni
- "w poniedziałek", "w piątek" → najbliższy ten dzień
- "za tydzień" → +7 dni
- brak → null (użyj dzisiaj)

CONTEXT_TYPE (wykryj z tytułu):
- "deep_work" → programowanie, architektura, złożone problemy
- "communication" → spotkania, emaile, rozmowy, Slack
- "admin" → faktury, dokumentacja, setup
- "creative" → design, pisanie, brainstorming
- "learning" → czytanie docs, tutoriale
- "maintenance" → bug fixy, code review
- "personal" → sprawy osobiste
- "quick_wins" → małe zadania < 15 min

ESTIMATE_MIN (szacuj z tytułu):
- Krótkie zadanie (zadzwonić, sprawdzić): 15
- Normalne zadanie (napisać, przygotować): 30
- Długie zadanie (zaimplementować, zrobić research): 60
- Bardzo długie (refactor, migracja): 120

OBECNE ZADANIA: ${JSON.stringify(existingTasks, null, 2)}

ODPOWIEDŹ JSON:
{
  "action": "ADD_TASKS" | "UNDO" | "CANCEL_ALL",
  "tasks": [
    {
      "title": "Zadzwonić do klienta",
      "due_date": "2025-12-25",
      "estimate_min": 15,
      "context_type": "communication"
    }
  ],
  "message": "Dodano 2 zadania" (opcjonalne)
}

WAŻNE:
- Jeśli user mówi tylko "cofnij" → {"action": "UNDO", "tasks": []}
- Jeśli user mówi "anuluj wszystko" → {"action": "CANCEL_ALL", "tasks": []}
- Parsuj WSZYSTKIE zadania z transkryptu, nie tylko nowe
- due_date jako ISO string YYYY-MM-DD lub null
- Dzisiaj to ${new Date().toISOString().split('T')[0]}
`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const result: ParseResponse = JSON.parse(
      completion.choices[0].message.content || '{}'
    )

    console.log('✅ [Parse Ramble API] Parsed action:', result.action)
    console.log('✅ [Parse Ramble API] Tasks count:', result.tasks?.length || 0)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('❌ [Parse Ramble API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to parse transcript', details: error.message },
      { status: 500 }
    )
  }
}
