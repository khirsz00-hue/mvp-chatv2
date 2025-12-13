import { getOpenAIClient } from '@/lib/openai'
import { HAT_PROMPTS } from '../prompts/hats'
import { Decision, DecisionOption, HatColor, DecisionSynthesis } from '../types'

export class DecisionAIService {
  // Simple template replacement (no external dependencies needed)
  private static replaceTemplate(
    template: string,
    data: { title: string; description: string; options?: DecisionOption[]; isStart?: boolean }
  ): string {
    let result = template
    result = result.replace(/\{\{title\}\}/g, data.title)
    result = result.replace(/\{\{description\}\}/g, data.description)

    // Handle conditional blocks
    if (data.options && data.options.length > 0) {
      const optionsText = data.options
        .map(opt => `- ${opt.title}: ${opt.description || '(bez opisu)'}`)
        .join('\n')
      result = result.replace(
        /\{\{#if options\}\}[\s\S]*?\{\{\/if\}\}/g,
        `Opcje do rozważenia:\n${optionsText}`
      )
    } else {
      result = result.replace(/\{\{#if options\}\}[\s\S]*?\{\{\/if\}\}/g, '')
    }

    // Handle isStart conditional
    if (data.isStart !== undefined) {
      const startText = data.isStart
        ? 'jasno zdefiniować problem i kontekst tej decyzji'
        : 'stworzyć syntetyczne podsumowanie i plan działań na podstawie wszystkich perspektyw'
      result = result.replace(/\{\{#if isStart\}\}.*?\{\{else\}\}.*?\{\{\/if\}\}/g, startText)
    }

    return result
  }

  // Analyze decision from a specific hat perspective
  static async analyzeWithHat(
    decision: Decision,
    options: DecisionOption[],
    hatColor: HatColor,
    isStart: boolean = false
  ): Promise<string> {
    const hatPrompt = HAT_PROMPTS[hatColor]
    if (!hatPrompt) {
      throw new Error(`Invalid hat color: ${hatColor}`)
    }

    const userPrompt = this.replaceTemplate(hatPrompt.userPromptTemplate, {
      title: decision.title,
      description: decision.description,
      options,
      isStart
    })

    const openai = getOpenAIClient()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: hatPrompt.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    return completion.choices[0].message.content || ''
  }

  // Generate synthesis from all hat analyses
  static async generateSynthesis(
    decision: Decision,
    events: Array<{ hat_color: string; ai_response?: string | null; content: string }>
  ): Promise<DecisionSynthesis> {
    const hatAnalyses: Record<string, string> = {}

    events.forEach(event => {
      if (event.ai_response) {
        if (!hatAnalyses[event.hat_color]) {
          hatAnalyses[event.hat_color] = event.ai_response
        }
      }
    })

    const systemPrompt = `Jesteś doświadczonym facylitatorem metody 6 kapeluszy myślowych.
Twoim zadaniem jest stworzyć kompleksowe podsumowanie analizy decyzji z wszystkich perspektyw.

Przeanalizuj wyniki z każdego kapelusza i stwórz:
1. Listę kluczowych faktów
2. Listę emocji i intuicji
3. Listę ryzyk i zagrożeń
4. Listę korzyści i szans
5. Listę pomysłów i rozwiązań
6. Konkretny plan działań
7. Rekomendację

Odpowiedź zwróć w formacie JSON z kluczami: facts, emotions, risks, benefits, ideas, action_plan, recommendation.
Każdy klucz (oprócz action_plan i recommendation) powinien być tablicą stringów. action_plan i recommendation to pojedyncze stringi.`

    const userPrompt = `Decyzja: ${decision.title}

Analiza z poszczególnych perspektyw:

🔵 Start (Błękitny kapelusz):
${hatAnalyses['blue'] || 'Brak analizy'}

⚪ Fakty (Biały kapelusz):
${hatAnalyses['white'] || 'Brak analizy'}

🔴 Emocje (Czerwony kapelusz):
${hatAnalyses['red'] || 'Brak analizy'}

⚫ Ryzyka (Czarny kapelusz):
${hatAnalyses['black'] || 'Brak analizy'}

🟡 Korzyści (Żółty kapelusz):
${hatAnalyses['yellow'] || 'Brak analizy'}

🟢 Pomysły (Zielony kapelusz):
${hatAnalyses['green'] || 'Brak analizy'}

Stwórz kompleksowe podsumowanie i rekomendację.`

    const openai = getOpenAIClient()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(responseText)

    return {
      decision_id: decision.id,
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      emotions: Array.isArray(parsed.emotions) ? parsed.emotions : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
      action_plan: parsed.action_plan || '',
      recommendation: parsed.recommendation || '',
      created_at: new Date().toISOString()
    }
  }
}
