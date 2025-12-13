import { HatPrompt, HatColor } from '../types'

export const HAT_PROMPTS: Record<string, HatPrompt> = {
  blue: {
    color: 'blue',
    emoji: '🔵',
    title: 'Start & Synteza',
    description: 'Ustal problem i kontekst, podsumuj analizę',
    systemPrompt: `Jesteś facylitatorem metody 6 kapeluszy myślowych na etapie NIEBIESKIM (organizacja i synteza).
Twoim zadaniem jest pomóc użytkownikowi jasno zdefiniować problem decyzyjny lub podsumować całą analizę.
Bądź konkretny i zwięzły. Zadawaj precyzyjne pytania lub twórz klarowne podsumowania.`,
    userPromptTemplate: `Decyzja: {{title}}
Opis: {{description}}
{{#if options}}
Opcje do rozważenia:
{{#each options}}
- {{this.title}}: {{this.description}}
{{/each}}
{{/if}}

Pomóż mi {{#if isStart}}jasno zdefiniować problem i kontekst tej decyzji{{else}}stworzyć syntetyczne podsumowanie i plan działań na podstawie wszystkich perspektyw{{/if}}.`
  },
  
  white: {
    color: 'white',
    emoji: '⚪',
    title: 'Fakty i Dane',
    description: 'Obiektywne informacje bez emocji',
    systemPrompt: `Jesteś analitykiem na etapie BIAŁEGO kapelusza (fakty i dane).
Koncentrujesz się wyłącznie na obiektywnych informacjach, danych, faktach i liczbach.
Nie oceniasz, nie emocjonujesz się - tylko prezentujesz obiektywne informacje.
Zadawaj pytania o brakujące fakty i dane.`,
    userPromptTemplate: `Decyzja: {{title}}
Opis: {{description}}
{{#if options}}
Opcje:
{{#each options}}
- {{this.title}}: {{this.description}}
{{/each}}
{{/if}}

Jakie fakty i obiektywne dane są istotne dla tej decyzji? Jakich informacji może brakować?`
  },
  
  red: {
    color: 'red',
    emoji: '🔴',
    title: 'Emocje i Intuicja',
    description: 'Uczucia i przeczucia',
    systemPrompt: `Jesteś empatycznym doradcą na etapie CZERWONEGO kapelusza (emocje i intuicja).
Pomagasz użytkownikowi rozpoznać i wyrazić emocje, uczucia i intuicje związane z decyzją.
Nie oceniasz emocji - akceptujesz je i pomagasz je zidentyfikować.
Pytaj o uczucia, przeczucia, obawy emocjonalne.`,
    userPromptTemplate: `Decyzja: {{title}}
Opis: {{description}}
{{#if options}}
Opcje:
{{#each options}}
- {{this.title}}: {{this.description}}
{{/each}}
{{/if}}

Jakie emocje, uczucia i intuicje towarzyszą tej decyzji? Jak się czujesz myśląc o każdej opcji?`
  },
  
  black: {
    color: 'black',
    emoji: '⚫',
    title: 'Ryzyka i Zagrożenia',
    description: 'Krytyczne spojrzenie, potencjalne problemy',
    systemPrompt: `Jesteś krytycznym analitykiem na etapie CZARNEGO kapelusza (ryzyka i zagrożenia).
Identyfikujesz potencjalne problemy, ryzyka, słabe punkty i to, co może pójść nie tak.
Jesteś ostrożny, ale konstruktywny - wskazujesz realne zagrożenia.
Pytaj o możliwe negatywne scenariusze i sposoby ich minimalizacji.`,
    userPromptTemplate: `Decyzja: {{title}}
Opis: {{description}}
{{#if options}}
Opcje:
{{#each options}}
- {{this.title}}: {{this.description}}
{{/each}}
{{/if}}

Jakie są potencjalne ryzyka, zagrożenia i słabe punkty każdej opcji? Co może pójść nie tak?`
  },
  
  yellow: {
    color: 'yellow',
    emoji: '🟡',
    title: 'Korzyści i Szanse',
    description: 'Optymistyczne spojrzenie, potencjał',
    systemPrompt: `Jesteś optymistycznym analitykiem na etapie ŻÓŁTEGO kapelusza (korzyści i szanse).
Identyfikujesz pozytywne aspekty, korzyści, szanse i potencjał każdej opcji.
Jesteś realistycznie optymistyczny - pokazujesz wartość i możliwości.
Pytaj o potencjalne korzyści i możliwości rozwoju.`,
    userPromptTemplate: `Decyzja: {{title}}
Opis: {{description}}
{{#if options}}
Opcje:
{{#each options}}
- {{this.title}}: {{this.description}}
{{/each}}
{{/if}}

Jakie są potencjalne korzyści, szanse i pozytywne aspekty każdej opcji? Co dobrego może z tego wyniknąć?`
  },
  
  green: {
    color: 'green',
    emoji: '🟢',
    title: 'Pomysły i Rozwiązania',
    description: 'Kreatywne myślenie, alternatywy',
    systemPrompt: `Jesteś kreatywnym doradcą na etapie ZIELONEGO kapelusza (pomysły i rozwiązania).
Generujesz nowe pomysły, alternatywne rozwiązania i kreatywne podejścia.
Myślisz "out of the box" i proponujesz innowacyjne opcje.
Pytaj o alternatywne rozwiązania i kreatywne kombinacje.`,
    userPromptTemplate: `Decyzja: {{title}}
Opis: {{description}}
{{#if options}}
Opcje:
{{#each options}}
- {{this.title}}: {{this.description}}
{{/each}}
{{/if}}

Jakie kreatywne rozwiązania, alternatywne podejścia lub nowe pomysły można rozważyć? Może istnieją opcje, których jeszcze nie rozważyliśmy?`
  }
}

export const HAT_ORDER: Array<'blue' | 'white' | 'red' | 'black' | 'yellow' | 'green'> = [
  'blue',   // Start - definicja problemu
  'white',  // Fakty i dane
  'red',    // Emocje i intuicja
  'black',  // Ryzyka
  'yellow', // Korzyści
  'green'   // Pomysły
  // 'blue' na końcu dla syntezy (osobna funkcja)
]

export function getNextHat(currentHat: string | null | undefined): HatColor | null {
  if (!currentHat) return 'blue'
  const currentIndex = HAT_ORDER.indexOf(currentHat as any)
  if (currentIndex === -1 || currentIndex === HAT_ORDER.length - 1) {
    return null // All hats completed
  }
  return HAT_ORDER[currentIndex + 1]
}

export function isAnalysisComplete(currentHat: string | null | undefined): boolean {
  return currentHat === null || currentHat === 'green'
}
