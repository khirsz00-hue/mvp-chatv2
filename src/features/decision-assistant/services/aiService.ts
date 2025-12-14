import OpenAI from 'openai'
import { HatColor } from '../types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

      const response = await openai.chat.completions.create({
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
}
