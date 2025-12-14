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
        blue: `Perspektywa: ORGANIZACJA I PROCES
Wygeneruj dokładnie 3 pytania pomagające:
- Zdefiniować problem i cel decyzji
- Zorganizować proces myślenia
- Określić kryteria i priorytety
Pytania muszą być konkretne i dotyczące struktury problemu.`,
        white: `Perspektywa: FAKTY I DANE
Wygeneruj dokładnie 3 pytania o:
- Obiektywne fakty i dostępne informacje
- Konkretne liczby, koszty, terminy
- Brakujące dane potrzebne do decyzji
Pytania muszą być faktograficzne, bez emocji i ocen.`,
        red: `Perspektywa: EMOCJE I INTUICJA
Wygeneruj dokładnie 3 pytania o:
- Odczucia i emocje związane z decyzją
- Intuicyjne przeczucia (dobre i złe)
- Reakcje ciała i "głos wewnętrzny"
Pytania muszą dotyczyć emocji, nie logiki.`,
        black: `Perspektywa: RYZYKA I ZAGROŻENIA
Wygeneruj dokładnie 3 pytania o:
- Potencjalne ryzyka i zagrożenia
- Najgorsze możliwe scenariusze
- Przeszkody i trudności
Pytania muszą być krytyczne i ostrożne, koncentrować się na problemach.`,
        yellow: `Perspektywa: KORZYŚCI I SZANSE
Wygeneruj dokładnie 3 pytania o:
- Korzyści i pozytywne aspekty
- Możliwości i potencjał wzrostu
- Długoterminowe korzyści
Pytania muszą być optymistyczne, koncentrować się na wartości.`,
        green: `Perspektywa: KREATYWNOŚĆ I ALTERNATYWY
Wygeneruj dokładnie 3 pytania stymulujące:
- Nietypowe rozwiązania i alternatywy
- Kreatywne podejścia do problemu
- Innowacyjne możliwości
Pytania muszą prowokować do nieszablonowego myślenia.`
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

Zwróć odpowiedź w formacie JSON: { "questions": ["pytanie 1", "pytanie 2", "pytanie 3"] }
Pytania powinny być w języku polskim, konkretne i dostosowane do tej konkretnej decyzji.
`

      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Jesteś ekspertem od metody Six Thinking Hats Edwarda de Bono.

ZASADY:
1. Wygeneruj DOKŁADNIE 3 pytania (nie więcej, nie mniej)
2. Każde pytanie musi być UNIKALNE i specyficzne dla danej perspektywy
3. NIE używaj ogólnych pytań typu "Co myślisz o..."
4. Pytania muszą być KONKRETNE i odnoszące się do decyzji użytkownika
5. Każde pytanie z innej "podkategorii" danej perspektywy
6. Język: polski
7. Format JSON: { "questions": ["pytanie 1", "pytanie 2", "pytanie 3"] }`
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
    options_analysis?: Array<{
      option: string
      pros: string[]
      cons: string[]
      score: string
      summary: string
    }>
    recommended_option?: {
      option: string
      reasoning: string
    }
    next_steps?: string[]
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
    { "hat": "emoji", "name": "nazwa", "synthesis": "2-3 zdania syntezy z tej perspektywy" }
  ],
  "insights": [
    "Kluczowy wniosek 1 (konkretny)",
    "Kluczowy wniosek 2 (konkretny)",
    "Kluczowy wniosek 3 (konkretny)"
  ],
  "options_analysis": [
    {
      "option": "Nazwa opcji/ścieżki",
      "pros": ["konkretna zaleta", "konkretna zaleta"],
      "cons": ["konkretna wada", "konkretna wada"],
      "score": "X/10",
      "summary": "Jedno zdanie podsumowania"
    }
  ],
  "recommended_option": {
    "option": "KONKRETNA nazwa najlepszej opcji",
    "reasoning": "Wyjaśnienie w 2-3 zdaniach DLACZEGO ta opcja jest najlepsza dla użytkownika, bazując na CAŁEJ analizie z 6 kapeluszy"
  },
  "next_steps": [
    "Konkretny pierwszy krok do wykonania",
    "Konkretny drugi krok",
    "Konkretny trzeci krok"
  ],
  "recommendation": "Finalna rekomendacja (2-3 akapity z konkretnymi wskazówkami)"
}

WAŻNE:
- Bazuj na WSZYSTKICH odpowiedziach ze wszystkich kapeluszy
- Rekomendacja musi być KONKRETNA (nie "rozważ opcję A", ale "Wybierz opcję A ponieważ...")
- Uzasadnienie musi odnosić się do faktów z analizy
- Jeśli użytkownik nie podał gotowych opcji, zaproponuj 2-3 opcje bazując na analizie
- Zwróć uwagę na wszystkie dostępne perspektywy i stwórz spójne, pomocne podsumowanie w języku polskim.
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
