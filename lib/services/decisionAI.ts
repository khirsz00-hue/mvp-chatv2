// Decision AI Service - Handles AI analysis for decisions
import { getOpenAIClient } from '../openai'
import type {
  Decision,
  DecisionOption,
  AIAnalysisRequest,
  AIAnalysisResponse,
} from '../types/decisions'

const DECISION_ASSISTANT_PROMPT = `Jesteś asystentem AI specjalizującym się w pomocy przy podejmowaniu decyzji. Twoja rola to:

1. Analiza przedstawionej decyzji i dostępnych opcji
2. Identyfikacja kluczowych czynników wpływających na decyzję
3. Rozważenie potencjalnych konsekwencji każdej opcji
4. Przedstawienie zrównoważonej analizy uwzględniającej różne perspektywy
5. Wspieranie użytkownika w procesie decyzyjnym (nie podejmowanie decyzji za niego)

Zasady analizy:
- Bądź obiektywny i wyważony
- Uwzględniaj różne perspektywy (logiczna, emocjonalna, praktyczna)
- Wskazuj potencjalne ryzyka i korzyści
- Zadawaj pytania pomocnicze, które mogą pomóc w podjęciu decyzji
- Nie narzucaj swojej opinii, ale wspieraj proces myślowy użytkownika
- Używaj języka polskiego

Format odpowiedzi:
- Analiza sytuacji
- Przegląd opcji z ocenami
- Kluczowe pytania do przemyślenia
- Rekomendacje (jeśli to możliwe)
`

/**
 * Analyze a decision and provide AI insights
 */
export async function analyzeDecision(
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const openai = getOpenAIClient()
  const { decision, options, analysisType = 'full' } = request

  // Build the prompt
  const userPrompt = buildAnalysisPrompt(decision, options, analysisType)

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: DECISION_ASSISTANT_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const analysis = response.choices[0]?.message?.content || ''

    // Try to extract structured information from the response
    const structuredResponse = parseAIResponse(analysis, options)

    return {
      analysis,
      ...structuredResponse,
    }
  } catch (error) {
    console.error('Error analyzing decision with AI:', error)
    throw new Error('Failed to analyze decision')
  }
}

/**
 * Build the analysis prompt based on decision and options
 */
function buildAnalysisPrompt(
  decision: Decision,
  options: DecisionOption[],
  analysisType: string
): string {
  let prompt = `# Decyzja do podjęcia\n\n`
  prompt += `**Tytuł:** ${decision.title}\n\n`

  if (decision.description) {
    prompt += `**Opis:** ${decision.description}\n\n`
  }

  if (decision.context) {
    prompt += `**Kontekst:** ${decision.context}\n\n`
  }

  if (options.length > 0) {
    prompt += `## Dostępne opcje:\n\n`
    options.forEach((option, index) => {
      prompt += `### Opcja ${index + 1}: ${option.label}\n`
      if (option.description) {
        prompt += `${option.description}\n`
      }
      if (option.pros && option.pros.length > 0) {
        prompt += `\n**Zalety:**\n${option.pros.map(p => `- ${p}`).join('\n')}\n`
      }
      if (option.cons && option.cons.length > 0) {
        prompt += `\n**Wady:**\n${option.cons.map(c => `- ${c}`).join('\n')}\n`
      }
      prompt += `\n`
    })
  }

  // Add specific instructions based on analysis type
  switch (analysisType) {
    case 'pros_cons':
      prompt += `\nPrzeanalizuj szczegółowo zalety i wady każdej opcji.`
      break
    case 'risk_assessment':
      prompt += `\nPrzeanalizuj ryzyka związane z każdą opcją i jak je zminimalizować.`
      break
    case 'recommendation':
      prompt += `\nNa podstawie dostępnych informacji, przedstaw rekomendację wraz z uzasadnieniem.`
      break
    case 'full':
    default:
      prompt += `\nPrzeprowadź pełną analizę decyzji, uwzględniając wszystkie aspekty.`
  }

  return prompt
}

/**
 * Parse AI response to extract structured data
 */
function parseAIResponse(
  analysis: string,
  options: DecisionOption[]
): Partial<AIAnalysisResponse> {
  const result: Partial<AIAnalysisResponse> = {}

  // Try to extract recommendation
  const recommendationMatch = analysis.match(/rekomendacj[aeę]:\s*([^\n]+)/i)
  if (recommendationMatch) {
    result.recommendation = recommendationMatch[1].trim()
  }

  // Try to extract confidence level
  const confidenceMatch = analysis.match(/pewność:\s*(\d+)%/i)
  if (confidenceMatch) {
    result.confidence = parseInt(confidenceMatch[1])
  }

  // Extract reasoning if present
  const reasoningMatch = analysis.match(/uzasadnienie:\s*([^#]+)/is)
  if (reasoningMatch) {
    result.reasoning = reasoningMatch[1].trim()
  }

  return result
}

/**
 * Generate pros and cons for an option using AI
 */
export async function generateProsAndCons(
  decision: Decision,
  optionLabel: string,
  optionDescription?: string
): Promise<{ pros: string[]; cons: string[] }> {
  const openai = getOpenAIClient()

  const prompt = `Dla decyzji: "${decision.title}"
${decision.description ? `Kontekst: ${decision.description}` : ''}

Opcja do analizy: "${optionLabel}"
${optionDescription ? `Opis: ${optionDescription}` : ''}

Wygeneruj listę 3-5 głównych zalet (pros) i 3-5 głównych wad (cons) tej opcji.

Format odpowiedzi (JSON):
{
  "pros": ["zaleta 1", "zaleta 2", ...],
  "cons": ["wada 1", "wada 2", ...]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Jesteś asystentem pomagającym w analizie decyzji. Odpowiadaj w formacie JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return {
      pros: parsed.pros || [],
      cons: parsed.cons || [],
    }
  } catch (error) {
    console.error('Error generating pros and cons:', error)
    return { pros: [], cons: [] }
  }
}

/**
 * Ask a clarifying question about the decision
 */
export async function askDecisionQuestion(
  decision: Decision,
  options: DecisionOption[],
  question: string
): Promise<string> {
  const openai = getOpenAIClient()

  const context = `Decyzja: ${decision.title}
${decision.description ? `Opis: ${decision.description}` : ''}

Opcje:
${options.map((o, i) => `${i + 1}. ${o.label}`).join('\n')}

Pytanie użytkownika: ${question}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: DECISION_ASSISTANT_PROMPT,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    return response.choices[0]?.message?.content || 'Nie udało się uzyskać odpowiedzi.'
  } catch (error) {
    console.error('Error asking decision question:', error)
    throw new Error('Failed to get answer')
  }
}
