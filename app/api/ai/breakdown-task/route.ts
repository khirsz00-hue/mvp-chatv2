import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'

// Forbidden subtask patterns
// These patterns are filtered out because they don't represent concrete, actionable steps
// that help people with ADHD make progress. Instead, they are vague meta-tasks that
// can increase cognitive load and paralysis.
const FORBIDDEN_PATTERNS = [
  /^otwórz/i,      // "open..." - too vague, not a real action
  /^otwierz/i,     // alternative spelling of "open"
  /^zastanów się/i, // "think about..." - not actionable, increases anxiety
  /^przygotuj/i,   // "prepare..." - too vague, unclear completion criteria
  /^sprawdź/i,     // "check..." - unclear what specifically to check
  /^zapisz/i,      // "write down..." - meta-task, not the actual work
  /^zanotuj/i      // "note..." - similar to "write down"
]

function isForbiddenSubtask(title: string): boolean {
  return FORBIDDEN_PATTERNS.some(pattern => pattern.test(title.trim()))
}

export async function POST(req: Request) {
  try {
    const { 
      taskContent, 
      taskDescription, 
      mode = 'light',
      maxSubtasks = 3,
      maxMinutes = 20,
      qaContext = '',
      completedContext = ''
    } = await req.json()
    
    if (!taskContent) {
      return NextResponse.json({ error: 'Missing taskContent' }, { status: 400 })
    }
    
    const descriptionPart = taskDescription ? `\nOpis: "${taskDescription}"` : ''
    const qaContextPart = qaContext ? `\n\nOdpowiedzi użytkownika:\n${qaContext}` : ''
    const completedPart = completedContext ? `\n\nUkończone kroki: ${completedContext}` : ''
    
    let modeInstructions = ''
    let maxCandidates = maxSubtasks * 2 // Generate more candidates for evaluation
    let timeConstraint = `Czas: 5-${maxMinutes} minut każdy`
    
    if (mode === 'light') {
      modeInstructions = `
TRYB: LEKKI
- Wygeneruj ${maxSubtasks} subtaski (pierwszy główny + ${maxSubtasks - 1} zapasowe)
- ${timeConstraint}
- NIE zadawaj pytań
- Jeden subtask = jeden sensowny krok do przodu`
    } else if (mode === 'stuck') {
      modeInstructions = `
TRYB: NIE WIEM JAK ZACZĄĆ
- Wygeneruj TYLKO 1 konkretny pierwszy ruch
- Czas: 10-${maxMinutes} minut
- Na podstawie odpowiedzi użytkownika
- NIE generuj planu, tylko pierwszy krok`
      maxCandidates = 3
    } else if (mode === 'crisis') {
      modeInstructions = `
TRYB: KRYZYSOWY
- Wygeneruj TYLKO 1 krok ≤ ${maxMinutes} minut
- Maksymalnie prosty i łatwy
- Bez presji, bez oceniania
- To tylko pierwszy mikro-ruch`
      maxCandidates = 3
      timeConstraint = `Czas: MAKSYMALNIE ${maxMinutes} minut`
    }
    
    // STAGE 1: Generate candidate subtasks
    const generationPrompt = `Jesteś asystentem AI wspierającym osoby z ADHD.

Zadanie: "${taskContent}"${descriptionPart}${qaContextPart}${completedPart}

${modeInstructions}

ZAKAZANE frazy na początku subtaska:
❌ "otwórz..."
❌ "zastanów się..."
❌ "przygotuj..."
❌ "sprawdź..."
❌ "zapisz..."

DOBRE subtaski (przykłady):
✓ "Napisz 3 zdania wprowadzenia"
✓ "Stwórz listę 5 głównych punktów"
✓ "Zaimplementuj funkcję logowania"

Wygeneruj ${maxCandidates} kandydatów na subtaski.

Zwróć JSON:
{
  "candidates": [
    {"title": "Konkretny krok 1", "description": "Dokładny opis", "estimatedMinutes": 15}
  ]
}`

    const openai = getOpenAIClient()
    
    const generationCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Jesteś asystentem ADHD specjalizującym się w tworzeniu małych, wykonalnych kroków.' },
        { role: 'user', content: generationPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
    
    let generationResponse
    try {
      generationResponse = JSON.parse(generationCompletion.choices[0].message.content || '{"candidates":[]}')
    } catch (parseErr: any) {
      console.error('Failed to parse generation response:', parseErr)
      throw new Error(`AI returned invalid JSON for subtask generation: ${parseErr.message}`)
    }
    
    let candidates = generationResponse.candidates || []
    
    // Filter out forbidden patterns
    candidates = candidates.filter((c: any) => !isForbiddenSubtask(c.title))
    
    if (candidates.length === 0) {
      throw new Error('No valid subtasks generated')
    }
    
    // STAGE 2: Evaluate and select best subtasks
    const evaluationPrompt = `Jesteś asystentem AI wspierającym osoby z ADHD. Oceń następujące kandydaty na subtaski:

Zadanie główne: "${taskContent}"

Kandydaci:
${candidates.map((c: any, i: number) => `${i + 1}. "${c.title}" (${c.estimatedMinutes} min)`).join('\n')}

Oceń każdy według kryteriów:
A. Czy popycha zadanie do przodu? (tak/nie)
B. Czas: ZA_MAŁY / OK / ZA_DUŻY
C. Czy bez niego zadanie by ruszyło? (tak/nie)

REGUŁY:
- A = NIE → usuń
- ZA_MAŁY → zaznacz do scalenia
- ZA_DUŻY → zaznacz do podziału (max na 2)
- Wybierz maksymalnie ${maxSubtasks} najlepszych

Zwróć JSON:
{
  "selected": [1, 2, 3],
  "reasoning": "Krótkie uzasadnienie wyboru"
}`

    const evaluationCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Jesteś asystentem ADHD specjalizującym się w ocenie jakości subtasków.' },
        { role: 'user', content: evaluationPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
    
    let evaluationResponse
    try {
      evaluationResponse = JSON.parse(evaluationCompletion.choices[0].message.content || '{"selected":[]}')
    } catch (parseErr: any) {
      console.error('Failed to parse evaluation response:', parseErr.message)
      // Fallback to selecting first candidates if evaluation fails
      evaluationResponse = { selected: Array.from({ length: Math.min(maxSubtasks, candidates.length) }, (_, i) => i + 1) }
    }
    
    const selectedIndices = evaluationResponse.selected || []
    
    // Get final subtasks
    const subtasks = selectedIndices
      .filter((idx: number) => idx >= 1 && idx <= candidates.length)
      .slice(0, maxSubtasks)
      .map((idx: number) => candidates[idx - 1])
    
    // Fallback if evaluation failed
    if (subtasks.length === 0 && candidates.length > 0) {
      subtasks.push(...candidates.slice(0, maxSubtasks))
    }
    
    return NextResponse.json({ subtasks })
  } catch (err: any) {
    console.error('Error in breakdown-task:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
