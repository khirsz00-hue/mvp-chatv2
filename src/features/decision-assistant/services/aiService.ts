import { getOpenAIClient } from '@/lib/openai'
import { HatColor, DecisionEvent } from '../types'

export class AIService {
  static async analyzeWithHat(
    hatColor: HatColor,
    decisionTitle: string,
    decisionDescription: string,
    options: Array<{ title: string; description?: string | null }>,
    prompt: string
  ): Promise<string> {
    try {
      const optionsText = options.map((opt, idx) => 
        `${idx + 1}. ${opt.title}${opt.description ? ': ' + opt.description : ''}`
      ).join('\n')

      const userMessage = `
Decyzja: ${decisionTitle}
Opis: ${decisionDescription}

Opcje:
${optionsText}

${prompt}
`

      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Jesteś asystentem AI pomagającym w podejmowaniu decyzji metodą Six Thinking Hats.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })

      return response.choices[0]?.message?.content || 'Brak odpowiedzi AI'
    } catch (error) {
      console.error('Error calling OpenAI:', error)
      throw new Error('Nie udało się uzyskać odpowiedzi AI')
    }
  }

  static async generateQuestionsForHat(
    decisionTitle: string,
    decisionDescription: string,
    options: Array<{ title: string; description?: string | null }>,
    hatColor: HatColor
  ): Promise<string[]> {
    try {
      const hatPrompts: Record<HatColor, string> = {
        blue: 'Wygeneruj 3-5 pytań pomocnych w zdefiniowaniu problemu i zorganizowaniu procesu myślenia',
        white: 'Wygeneruj 3-5 pytań o fakty, dane i obiektywne informacje',
        red: 'Wygeneruj 3-5 pytań o emocje, intuicje i przeczucia',
        black: 'Wygeneruj 3-5 pytań o ryzyka, zagrożenia i potencjalne problemy',
        yellow: 'Wygeneruj 3-5 pytań o korzyści, szanse i pozytywne aspekty',
        green: 'Wygeneruj 3-5 pytań stymulujących kreatywne myślenie i nowe pomysły'
      }

      const optionsText = options.length > 0 
        ? options.map((opt, idx) => `${idx + 1}. ${opt.title}${opt.description ? ': ' + opt.description : ''}`).join('\n')
        : 'Brak zdefiniowanych opcji'

      const userMessage = `
Decyzja: ${decisionTitle}
Opis: ${decisionDescription}

Opcje do rozważenia:
${optionsText}

${hatPrompts[hatColor]}

Zwróć odpowiedź w formacie JSON: { "questions": ["pytanie 1", "pytanie 2", ...] }
Pytania powinny być w języku polskim, konkretne i dostosowane do tej konkretnej decyzji.
`

      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Jesteś ekspertem w metodzie Six Thinking Hats. Generujesz przemyślane pytania pomagające w analizie decyzji. Odpowiadasz zawsze w formacie JSON.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('Brak odpowiedzi AI')
      }

      const parsed = JSON.parse(content)
      return parsed.questions || []
    } catch (error) {
      console.error('Error generating questions:', error)
      throw new Error('Nie udało się wygenerować pytań')
    }
  }

  static async generateSummary(
    decisionTitle: string,
    decisionDescription: string,
    options: Array<{ title: string; description?: string | null }>,
    events: DecisionEvent[]
  ): Promise<{
    perspectives: Array<{ hat: string; name: string; synthesis: string }>
    insights: string[]
    recommendation: string
  }> {
    try {
      // Organize events by hat color
      const hatNames: Record<HatColor, { emoji: string; name: string }> = {
        blue: { emoji: '🔵', name: 'Niebieski' },
        white: { emoji: '⚪', name: 'Biały' },
        red: { emoji: '🔴', name: 'Czerwony' },
        black: { emoji: '⚫', name: 'Czarny' },
        yellow: { emoji: '🟡', name: 'Żółty' },
        green: { emoji: '🟢', name: 'Zielony' }
      }

      const userInputsByHat: Record<string, string[]> = {}
      
      events.forEach(event => {
        if (event.event_type === 'user_input') {
          if (!userInputsByHat[event.hat_color]) {
            userInputsByHat[event.hat_color] = []
          }
          try {
            const content = JSON.parse(event.content)
            const answers = content.questions
              ?.map((q: any) => `${q.question}: ${q.answer}`)
              .filter((a: string) => a.trim())
            if (answers && answers.length > 0) {
              userInputsByHat[event.hat_color].push(...answers)
            }
            if (content.additionalThoughts) {
              userInputsByHat[event.hat_color].push(`Dodatkowe przemyślenia: ${content.additionalThoughts}`)
            }
          } catch (e) {
            userInputsByHat[event.hat_color].push(event.content)
          }
        }
      })

      const optionsText = options.length > 0 
        ? options.map((opt, idx) => `${idx + 1}. ${opt.title}${opt.description ? ': ' + opt.description : ''}`).join('\n')
        : 'Brak zdefiniowanych opcji'

      let hatSummaries = ''
      Object.entries(userInputsByHat).forEach(([hatColor, inputs]) => {
        const hatInfo = hatNames[hatColor as HatColor]
        if (hatInfo && inputs.length > 0) {
          hatSummaries += `\n${hatInfo.emoji} ${hatInfo.name} Kapelusz:\n${inputs.join('\n')}\n`
        }
      })

      const userMessage = `
Decyzja: ${decisionTitle}
Opis: ${decisionDescription}

Opcje:
${optionsText}

Odpowiedzi użytkownika z każdego kapelusza:
${hatSummaries}

Na podstawie powyższej analizy Six Thinking Hats, wygeneruj kompletne podsumowanie w formacie JSON:
{
  "perspectives": [
    { "hat": "emoji", "name": "Nazwa kapelusza", "synthesis": "Zwięzła synteza tej perspektywy" }
  ],
  "insights": ["Kluczowy wniosek 1", "Kluczowy wniosek 2", ...],
  "recommendation": "Finalna rekomendacja (2-3 akapity z konkretnymi wskazówkami)"
}

Zwróć uwagę na wszystkie dostępne perspektywy i stwórz spójne, pomocne podsumowanie w języku polskim.
`

      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Jesteś ekspertem w metodzie Six Thinking Hats i syntetyzujesz analizy decyzji. Tworzysz pomocne, konkretne podsumowania. Odpowiadasz zawsze w formacie JSON.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('Brak odpowiedzi AI')
      }

      return JSON.parse(content)
    } catch (error) {
      console.error('Error generating summary:', error)
      throw new Error('Nie udało się wygenerować podsumowania')
    }
  }
}
