import { HatColor } from '../types'

export interface HatPrompt {
  color: HatColor
  emoji: string
  title: string
  description: string
  prompt: string
}

export const HAT_PROMPTS: Record<HatColor, HatPrompt> = {
  blue: {
    color: 'blue',
    emoji: '🔵',
    title: 'Niebieski Kapelusz',
    description: 'Organizacja i proces myślenia',
    prompt: 'Jako niebieski kapelusz, przeanalizuj proces decyzyjny. Jakie pytania należy zadać? Jaki powinien być proces analizy?'
  },
  white: {
    color: 'white',
    emoji: '⚪',
    title: 'Biały Kapelusz',
    description: 'Fakty i dane',
    prompt: 'Jako biały kapelusz, skoncentruj się na faktach i danych. Jakie informacje posiadamy? Czego nam brakuje?'
  },
  red: {
    color: 'red',
    emoji: '🔴',
    title: 'Czerwony Kapelusz',
    description: 'Emocje i intuicja',
    prompt: 'Jako czerwony kapelusz, wyraź emocje i intuicję związaną z tą decyzją. Co czujesz? Jakie są pierwsze wrażenia?'
  },
  black: {
    color: 'black',
    emoji: '⚫',
    title: 'Czarny Kapelusz',
    description: 'Krytyka i ryzyka',
    prompt: 'Jako czarny kapelusz, wskaż zagrożenia i ryzyka. Co może pójść nie tak? Jakie są słabe strony każdej opcji?'
  },
  yellow: {
    color: 'yellow',
    emoji: '🟡',
    title: 'Żółty Kapelusz',
    description: 'Optymizm i korzyści',
    prompt: 'Jako żółty kapelusz, wskaż korzyści i pozytywne aspekty. Co może się udać? Jakie są mocne strony każdej opcji?'
  },
  green: {
    color: 'green',
    emoji: '🟢',
    title: 'Zielony Kapelusz',
    description: 'Kreatywność i alternatywy',
    prompt: 'Jako zielony kapelusz, myśl kreatywnie. Jakie są inne możliwości? Czy możemy coś połączyć lub zmodyfikować?'
  }
}

export const HAT_ORDER: HatColor[] = ['blue', 'white', 'red', 'black', 'yellow', 'green']
