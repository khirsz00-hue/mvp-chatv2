import { getOpenAIClient } from '@/lib/openai'
import { HatColor, DecisionEvent } from '../types'

export class AIService {
  static async analyzeWithHat(
    hatColor: HatColor,
    decisionTitle: string,
    decisionDescription: string,
    options: Array<{ title: string; description?: string | null }> = [],
    prompt: string
  ): Promise<string> {
    try {
      const optionsText = options.map((opt, idx) => 
        `${idx + 1}. ${opt.title}${opt.description ? ': ' + opt.description : ''}`
      ).join('\n')

      const optionsSection = optionsText
        ? `Opcje:\n${optionsText}`
        : 'Opcje: Brak zdefiniowanych opcji - zaproponuj 2-3 najsensowniejsze alternatywy i wskaż najlepszą.'

      const userMessage = `
Decyzja: ${decisionTitle}
Opis: ${decisionDescription}

${optionsSection}

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
    hatColor: HatColor
  ): Promise<string[]> {
    try {
      const hatPrompts: Record<HatColor, string> = {
        blue: `3 pytania (max 12 słów każde) które:
- Ustalają konkretny cel i rezultat sukcesu
- Zbierają największe ograniczenia (czas/pieniądze/zasoby)
- Definiują 1–2 kryteria oceny teraz
Pytania muszą być ostre, jednoznaczne, bez ogólników.`,
        white: `3 krótkie pytania o twarde fakty:
- Liczby/koszty/termine kluczowe dla decyzji
- Jakie dane są pewne, a czego brakuje
- Źródło lub sposób szybkiej weryfikacji
Pytania tylko o dane, bez opinii.`,
        red: `3 krótkie pytania o emocje i intuicję:
- Co budzi entuzjazm lub opór
- Gdzie czujesz największy niepokój
- Co mówi „pierwszy odruch”
Pytania mają wyciągać konkretny sygnał emocjonalny.`,
        black: `3 pytania ostrzegawcze (max 12 słów):
- Najgorszy realistyczny scenariusz i jego skutki
- Największa przeszkoda, która zablokuje decyzję
- Wczesne sygnały, że ryzyko rośnie
Pytania mają odsłaniać realne zagrożenia.`,
        yellow: `3 pytania o wartość (max 12 słów):
- Największa korzyść, którą można uchwycić szybko
- Długoterminowa przewaga / szansa
- Jaki efekt pozytywny byłby decydujący
Pytania mają kierować na jasne zyski.`,
        green: `3 pytania pobudzające rozwiązania:
- Jak zrobić to taniej/szybciej bez utraty jakości
- Alternatywa spoza schematu, którą warto sprawdzić
- Jeden mały eksperyment do natychmiastowego testu
Pytania muszą wymuszać konkretny pomysł.`
      }

      const userMessage = `
Decyzja: ${decisionTitle}
Opis: ${decisionDescription}

${hatPrompts[hatColor]}

Założenia:
- To Ty wygenerujesz opcje i wskażesz najlepszą, nie pytaj o listę opcji.
- Użytkownik ma włożyć minimalny wysiłek – pytania mają być krótkie, proste, bez dygresji.
- Każde pytanie ma wyciągać możliwie największą wartość do podjęcia decyzji.

Zwróć odpowiedź w formacie JSON: { "questions": ["pytanie 1", "pytanie 2", "pytanie 3"] }
Pytania powinny być w języku polskim, konkretne i dopasowane do tej decyzji.
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
3. Maks. 12 słów na pytanie, zero waty, zero wstępów
4. Pytania muszą być KONKRETNE i odnosić się do decyzji użytkownika
5. Każde pytanie z innej "podkategorii" danej perspektywy
6. Użytkownik nie podaje opcji – to Ty później je zaproponujesz, więc nie pytaj o ich listę
7. Pytania mają minimalizować wysiłek użytkownika i prowadzić do natychmiast użytecznych odpowiedzi
8. Język: polski
9. Format JSON: { "questions": ["pytanie 1", "pytanie 2", "pytanie 3"] }`
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
    options: Array<{ title: string; description?: string | null }> = [],
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
        : 'Brak zdefiniowanych opcji — zaproponuj 2-3 najmocniejsze warianty na podstawie analizy'

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
    { "hat": "emoji", "name": "nazwa", "synthesis": "1-2 krótkie zdania (maks 25 słów) z tej perspektywy" }
  ],
  "insights": [
    "Kluczowy wniosek 1 (maks 15 słów, prosty język)",
    "Kluczowy wniosek 2 (maks 15 słów, prosty język)",
    "Kluczowy wniosek 3 (maks 15 słów, prosty język)"
  ],
  "options_analysis": [
    {
      "option": "Nazwa opcji/ścieżki",
      "pros": ["konkretna zaleta (<=10 słów)", "konkretna zaleta (<=10 słów)"],
      "cons": ["konkretna wada (<=10 słów)", "konkretna wada (<=10 słów)"],
      "score": "X/10",
      "summary": "1 krótkie zdanie podsumowania (<=18 słów)"
    }
  ],
  "recommended_option": {
    "option": "KONKRETNA nazwa najlepszej opcji",
    "reasoning": "2-3 bardzo krótkie zdania (łącznie <=45 słów) DLACZEGO ta opcja jest najlepsza"
  },
  "next_steps": [
    "Pierwszy krok (<=10 słów)",
    "Drugi krok (<=10 słów)",
    "Trzeci krok (<=10 słów)"
  ],
  "recommendation": "3-5 bardzo krótkich punktów (każdy w nowej linii) w prostym języku, bez dygresji"
}

WAŻNE:
- Bazuj na WSZYSTKICH odpowiedziach ze wszystkich kapeluszy
- Rekomendacja musi być KONKRETNA (nie "rozważ opcję A", ale "Wybierz opcję A ponieważ...")
- Uzasadnienie musi odnosić się do faktów z analizy
- Jeśli użytkownik nie podał gotowych opcji, zaproponuj 2-3 opcje bazując na analizie
- Zwróć uwagę na wszystkie dostępne perspektywy i stwórz spójne, pomocne podsumowanie w języku polskim.
- Styl ADHD-friendly: proste słowa, krótkie zdania, zero wstępów, same konkrety.
`

      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Jesteś ekspertem w metodzie Six Thinking Hats i syntetyzujesz analizy decyzji.

KRYTYCZNA ZASADA:
- Bazuj WYŁĄCZNIE na odpowiedziach użytkownika
- NIE wymyślaj, NIE zakładaj, NIE dodawaj informacji których użytkownik nie podał
- Jeśli dane są niepełne, napisz o tym w analizie

Styl: krótko, prosto, zero dygresji; każde pole ma być maksymalnie zwięzłe (kilka słów).

Tworzysz pomocne, konkretne podsumowania w języku polskim. Odpowiadasz zawsze w formacie JSON.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 1200,
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
