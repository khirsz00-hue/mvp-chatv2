// Six Thinking Hats AI Service
// Handles AI interactions for the Six Thinking Hats decision-making process

import { getOpenAIClient } from '../openai'
import { HAT_PROMPTS, SYNTHESIS_PROMPT } from '../prompts/sixHats'
import type { Decision, HatColor, SixHatsAnalysis, SixHatsSynthesis, HatAnswer } from '../types/decisions'

/**
 * Simple template string replacement with conditional support
 * Replaces {{variable}} with values from data object
 * Handles {{#if variable}}...{{/if}} conditionals
 */
function simpleTemplate(template: string, data: Record<string, any>): string {
  // First handle conditionals {{#if variable}}...{{/if}}
  let result = template.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    return data[key] ? content : ''
  })
  
  // Then handle simple variable replacements {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : ''
  })
  
  return result
}

/**
 * Generate AI questions for a specific thinking hat
 */
export async function generateHatQuestions(
  decision: Decision,
  hatColor: HatColor,
  previousAnswer?: string
): Promise<string[]> {
  const openai = getOpenAIClient()
  const hatPrompt = HAT_PROMPTS[hatColor]

  if (!hatPrompt) {
    throw new Error(`Invalid hat color: ${hatColor}`)
  }

  // Build the user prompt
  const userPrompt = simpleTemplate(hatPrompt.userPromptTemplate, {
    decision: decision.title,
    description: decision.description || '',
    context: decision.context || '',
    userAnswer: previousAnswer || ''
  })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: hatPrompt.systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return parsed.questions || []
  } catch (error) {
    console.error(`Error generating questions for ${hatColor} hat:`, error)
    // Return fallback questions if AI fails
    return getFallbackQuestions(hatColor)
  }
}

/**
 * Generate AI analysis based on user's answer for a specific hat
 */
export async function analyzeHatAnswer(
  decision: Decision,
  hatColor: HatColor,
  userAnswer: string,
  questions: string[]
): Promise<string> {
  const openai = getOpenAIClient()
  const hatPrompt = HAT_PROMPTS[hatColor]

  if (!hatPrompt) {
    throw new Error(`Invalid hat color: ${hatColor}`)
  }

  const analysisPrompt = `Decyzja: "${decision.title}"
${decision.description ? `Opis: ${decision.description}` : ''}

Pytania pomocnicze:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Odpowiedź użytkownika:
${userAnswer}

Na podstawie odpowiedzi użytkownika, stwórz zwięzłą analizę (2-3 akapity) z perspektywy ${hatPrompt.title}.
Wydobądź kluczowe wnioski i insights, które pomogą w podjęciu decyzji.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: hatPrompt.systemPrompt + '\n\nTwoim zadaniem jest teraz przeanalizować odpowiedź użytkownika i wydobyć kluczowe wnioski.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    return response.choices[0]?.message?.content || 'Nie udało się wygenerować analizy.'
  } catch (error) {
    console.error(`Error analyzing answer for ${hatColor} hat:`, error)
    throw new Error('Nie udało się przeanalizować odpowiedzi')
  }
}

/**
 * Generate final synthesis after all hats are complete
 */
export async function generateSynthesis(
  decision: Decision,
  hatAnswers: HatAnswer[]
): Promise<SixHatsSynthesis> {
  const openai = getOpenAIClient()

  // Build answers map for template
  const answersMap: Record<string, string> = {}
  hatAnswers.forEach(answer => {
    const key = `${answer.hat}Answer`
    answersMap[key] = answer.userAnswer || 'Brak odpowiedzi'
  })

  // Build synthesis prompt
  let synthesisPrompt = SYNTHESIS_PROMPT
  synthesisPrompt = simpleTemplate(synthesisPrompt, {
    decision: decision.title,
    description: decision.description || '',
    ...answersMap
  })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Jesteś ekspertem w metodzie 6 kapeluszy myślowych. Tworzysz kompleksowe syntezy decyzji. Zawsze odpowiadasz w formacie JSON.',
        },
        {
          role: 'user',
          content: synthesisPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return {
      summary: parsed.summary || 'Brak podsumowania',
      facts: parsed.facts || [],
      emotions: parsed.emotions || [],
      risks: parsed.risks || [],
      benefits: parsed.benefits || [],
      ideas: parsed.ideas || [],
      options: parsed.options || [],
      recommendation: parsed.recommendation || '',
      nextSteps: parsed.nextSteps || [],
    }
  } catch (error) {
    console.error('Error generating synthesis:', error)
    throw new Error('Nie udało się wygenerować syntezy')
  }
}

/**
 * Retry logic for rate limiting
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a rate limit error
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        const delay = delayMs * Math.pow(2, i) // Exponential backoff
        console.log(`Rate limited, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // For other errors, throw immediately
      throw error
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Fallback questions when AI generation fails
 */
function getFallbackQuestions(hatColor: HatColor): string[] {
  const fallbacks: Record<HatColor, string[]> = {
    blue: [
      'Jaki jest główny cel tej decyzji?',
      'Jakie kryteria są najważniejsze przy podejmowaniu tej decyzji?',
      'Jaki masz horyzont czasowy na podjęcie decyzji?',
      'Jakie są główne ograniczenia?'
    ],
    white: [
      'Jakie konkretne fakty znasz na temat tej sytuacji?',
      'Jakich informacji Ci brakuje?',
      'Jakie dane lub liczby są istotne?',
      'Jakie sprawdzone informacje masz do dyspozycji?'
    ],
    red: [
      'Jakie emocje wywołuje u Ciebie ta decyzja?',
      'Co podpowiada Ci intuicja?',
      'Czego się obawiasz w związku z tą decyzją?',
      'Jak czujesz się myśląc o każdej z opcji?'
    ],
    black: [
      'Jakie są największe ryzyka związane z tą decyzją?',
      'Co może pójść nie tak?',
      'Jakie są słabe punkty każdej opcji?',
      'Jakie mogą być negatywne konsekwencje?'
    ],
    yellow: [
      'Jakie są potencjalne korzyści tej decyzji?',
      'Jakie szanse może otworzyć ta decyzja?',
      'Co dobrego może z tego wyniknąć?',
      'Jaki jest najlepszy możliwy scenariusz?'
    ],
    green: [
      'Jakie alternatywne podejścia możesz rozważyć?',
      'Czy można połączyć różne opcje w nowy sposób?',
      'Jakie niestandardowe rozwiązania mogą działać?',
      'Jak możesz myśleć o tym inaczej?'
    ]
  }

  return fallbacks[hatColor] || []
}
