/**
 * Day Assistant AI Service
 * 
 * Handles AI-powered subtask generation and chat intent recognition using OpenAI
 */

import OpenAI from 'openai'
import { getOpenAIClient } from '@/lib/openai'
import {
  SubtaskGenerationRequest,
  SubtaskGenerationResponse,
  ChatCommandIntent,
  AgentResponse,
  EnergyMode,
  DetailLevel,
  ENERGY_MODE_CONSTRAINTS
} from '@/lib/types/dayAssistant'

// Use lazy initialization via getOpenAIClient() instead of module-level initialization
const getOpenAI = () => getOpenAIClient()

/**
 * Generate subtasks for a task using AI
 */
export async function generateSubtasks(
  request: SubtaskGenerationRequest
): Promise<SubtaskGenerationResponse> {
  const { task_title, task_description, detail_level, energy_mode, user_preferences } = request

  const constraints = ENERGY_MODE_CONSTRAINTS[energy_mode]
  const maxDuration = constraints.maxStepDuration

  // Determine number of subtasks based on detail level
  const subtaskCounts = {
    minimum: 2,
    standard: 4,  // Default to 4 steps for ADHD-friendly workflow
    detailed: 6
  }
  const targetCount = subtaskCounts[detail_level]

  const prompt = buildSubtaskGenerationPrompt(
    task_title,
    task_description,
    detail_level,
    maxDuration,
    targetCount,
    user_preferences
  )

  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: SUBTASK_GENERATION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const result = JSON.parse(content)
    return {
      subtasks: result.subtasks || [],
      total_estimated_duration: result.total_estimated_duration || 0
    }
  } catch (error) {
    console.error('Error generating subtasks:', error)
    // Fallback to basic subtask
    return {
      subtasks: [
        {
          content: task_title,
          estimated_duration: Math.min(15, maxDuration)
        }
      ],
      total_estimated_duration: Math.min(15, maxDuration)
    }
  }
}

/**
 * Build prompt for subtask generation
 */
function buildSubtaskGenerationPrompt(
  taskTitle: string,
  taskDescription: string | undefined,
  detailLevel: DetailLevel,
  maxDuration: number,
  targetCount: number,
  userPreferences?: any
): string {
  return `
Zadanie: ${taskTitle}
${taskDescription ? `Opis: ${taskDescription}` : ''}

Poziom szczegółowości: ${detailLevel}
Maksymalny czas na krok: ${maxDuration} minut
Docelowa liczba kroków: ${targetCount}

Wygeneruj ${targetCount} konkretny${targetCount > 1 ? 'ch' : ''} krok${targetCount > 1 ? 'ów' : ''} do wykonania tego zadania.

ZASADY:
- Każdy krok musi być KONKRETEM akcją (czasownik + co)
- Czas trwania kroku NIE MOŻE przekroczyć ${maxDuration} minut
- Kroki powinny być wymierne i jasne
- Unikaj ogólników jak "Przemyśl...", "Zastanów się..."
- Każdy krok powinien przynosić widoczny postęp

${detailLevel === 'minimum' ? 'Stwórz 2 najprostsze kroki, które maksymalnie przybliżą do celu.' : ''}
${detailLevel === 'standard' ? 'Stwórz 4 kroki, które są praktyczne i wykonalne. To jest domyślny, najlepszy wybór.' : ''}
${detailLevel === 'detailed' ? 'Stwórz 6 kroków, które dzielą zadanie na drobne elementy.' : ''}

Zwróć JSON w formacie:
{
  "subtasks": [
    {
      "content": "Konkretny krok (czasownik + co)",
      "estimated_duration": 5
    }
  ],
  "total_estimated_duration": 5
}
`.trim()
}

/**
 * System prompt for subtask generation
 */
const SUBTASK_GENERATION_SYSTEM_PROMPT = `
Jesteś asystentem dnia, który pomaga rozbijać zadania na konkretne, wykonalne kroki.

ZASADY GENEROWANIA KROKÓW:
1. Każdy krok zaczyna się od czasownika akcji
2. Krok musi być KONKRETNY (nie "zaplanuj", ale "napisz listę 5 punktów")
3. Czas trwania kroku to REALISTYCZNA estymacja (nie wishful thinking)
4. Kroki są MAŁE - lepiej niedoszacować niż przeszacować
5. Krok musi być mierzalny - user wie, kiedy jest ukończony

STYL:
- Prosty, bezpośredni język
- Zero coachingu i motywacji
- Fokus na DZIAŁANIU, nie planowaniu
- Konkretny rezultat, nie proces

DOBRE PRZYKŁADY:
✅ "Napisz 3 punkty do prezentacji"
✅ "Zadzwoń do Jacka i ustal termin"
✅ "Przeczytaj mail od Anny i odpowiedz"

ZŁE PRZYKŁADY:
❌ "Zastanów się nad prezentacją"
❌ "Zaplanuj kontakt z Jackiem"
❌ "Przemyśl odpowiedź dla Anny"

Generuj TYLKO kroki w formacie JSON. Bez dodatkowych wyjaśnień.
`.trim()

/**
 * Recognize intent from chat command
 */
export async function recognizeChatIntent(
  message: string,
  context?: { currentTask?: string; energyMode?: EnergyMode }
): Promise<ChatCommandIntent> {
  const prompt = `
Wiadomość od użytkownika: "${message}"

Kontekst:
${context?.currentTask ? `Aktualne zadanie: ${context.currentTask}` : 'Brak aktywnego zadania'}
${context?.energyMode ? `Tryb energii: ${context.energyMode}` : ''}

Rozpoznaj intencję użytkownika i zwróć JSON:
{
  "command": "oryginalny tekst komendy",
  "intent": "pin_today" | "not_today" | "mega_important" | "energy_change" | "flow_block" | "meeting_slot" | "unknown",
  "params": { ... dodatkowe parametry jeśli potrzebne ... }
}

MAPOWANIE INTENCJI:
- "to jest mega ważne", "🔥", "bardzo ważne", "pilne" → "mega_important"
- "to odłóż", "🧊", "nie dziś", "później" → "not_today"
- "przypnij", "📌", "musi dziś być" → "pin_today"
- "zjazd", "🔴", "kryzys", "nie idzie" → "energy_change" (params: {mode: "crisis"})
- "flow", "🟢", "mam energię" → "energy_change" (params: {mode: "flow"})
- "normalnie", "🟡" → "energy_change" (params: {mode: "normal"})
- "zrób blok", "podobne zadania" → "flow_block"
- "kiedy mogę", "znajdź slot", "kiedy mam czas" → "meeting_slot"
- wszystko inne → "unknown"

Zwróć TYLKO JSON, bez dodatkowego tekstu.
`.trim()

  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Jesteś asystentem rozpoznającym intencje użytkownika. Odpowiadasz TYLKO w formacie JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { command: message, intent: 'unknown' }
    }

    return JSON.parse(content) as ChatCommandIntent
  } catch (error) {
    console.error('Error recognizing intent:', error)
    return { command: message, intent: 'unknown' }
  }
}

/**
 * Generate agent response based on action
 */
export async function generateAgentResponse(
  action: string,
  context: {
    taskTitle?: string
    affectedTasks?: string[]
    energyMode?: EnergyMode
  }
): Promise<AgentResponse> {
  const { taskTitle, affectedTasks, energyMode } = context

  // Pre-defined responses for common actions
  const responses: Record<string, AgentResponse> = {
    mega_important: {
      message: `OK, to jest 🔥 mega ważne. Wrzucam "${taskTitle}" do NOW${
        affectedTasks && affectedTasks.length > 0
          ? `, a "${affectedTasks[0]}" spada do LATER`
          : ''
      }.`,
      actions: [
        { label: '15-min krok', type: 'button', action: 'generate_step', params: { duration: 15 } },
        { label: 'Blok 45 min', type: 'button', action: 'generate_step', params: { duration: 45 } }
      ]
    },
    pin_today: {
      message: `Przypięte 📌. "${taskTitle}" zostaje na dzisiaj w kolejce NEXT.`,
      actions: []
    },
    not_today: {
      message: `OK, "${taskTitle}" odłożone 🧊 do LATER. Jutro będzie lepszy dzień.`,
      actions: []
    },
    energy_crisis: {
      message: `Przełączam na tryb 🔴 Zjazd. Kroki max 5 min, NEXT max 2 zadania. Chcesz szybkie zwycięstwo?`,
      actions: [
        { label: 'Szybkie zwycięstwo', type: 'button', action: 'quick_win', params: {} },
        { label: 'Pokaż kolejkę', type: 'button', action: 'show_queue', params: {} }
      ]
    },
    energy_normal: {
      message: `Tryb 🟡 Normalnie. Kroki 5-20 min, standard flow.`,
      actions: []
    },
    energy_flow: {
      message: `Tryb 🟢 Flow aktywny. Możesz robić dłuższe kroki (do 25 min). Chcesz blok podobnych zadań?`,
      actions: [
        { label: 'Zrób blok', type: 'button', action: 'create_flow_block', params: {} },
        { label: 'Nie, dalej normalnie', type: 'button', action: 'dismiss', params: {} }
      ]
    }
  }

  return responses[action] || {
    message: 'Rozumiem. Co dalej?',
    actions: []
  }
}

/**
 * Regenerate subtask with different style (after "nonsense" feedback)
 */
export async function regenerateSubtaskDifferentStyle(
  taskTitle: string,
  taskDescription: string | undefined,
  previousSubtask: string,
  energyMode: EnergyMode
): Promise<{ content: string; estimated_duration: number } | null> {
  const constraints = ENERGY_MODE_CONSTRAINTS[energyMode]
  const maxDuration = constraints.maxStepDuration

  const prompt = `
Zadanie: ${taskTitle}
${taskDescription ? `Opis: ${taskDescription}` : ''}

Poprzedni krok (NIE ZADZIAŁAŁ): "${previousSubtask}"

Użytkownik oznaczył ten krok jako "bez sensu". Wygeneruj NOWY krok, który będzie:
1. Bardziej KONKRETNY i działaniowy
2. Bardziej REALISTYCZNY (mniej ambitny)
3. Skupiony na REZULTACIE, nie na procesie

Maksymalny czas: ${maxDuration} minut

Zwróć JSON:
{
  "content": "Nowy, bardziej konkretny krok",
  "estimated_duration": 5
}
`.trim()

  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: SUBTASK_GENERATION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,  // Higher temperature for more variation
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const result = JSON.parse(content)
    return {
      content: result.content,
      estimated_duration: result.estimated_duration
    }
  } catch (error) {
    console.error('Error regenerating subtask:', error)
    return null
  }
}

/**
 * Find available meeting slots (basic implementation)
 */
export async function findMeetingSlots(
  duration: number,
  deadline?: string,
  existingTasks?: Array<{ start: string; end: string }>
): Promise<Array<{ date: string; start_time: string; end_time: string }>> {
  // This is a placeholder implementation
  // In a real app, this would integrate with Google Calendar API
  
  const slots: Array<{ date: string; start_time: string; end_time: string }> = []
  const today = new Date()
  
  // Generate 3 sample slots (morning, afternoon, next day)
  const times = [
    { date: today.toISOString().split('T')[0], start_time: '10:00', end_time: '10:30' },
    { date: today.toISOString().split('T')[0], start_time: '14:00', end_time: '14:30' },
    { date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], start_time: '09:00', end_time: '09:30' }
  ]
  
  return times
}
