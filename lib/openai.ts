import OpenAI from 'openai'

let openaiInstance: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY || 'dummy-key-for-build'
    openaiInstance = new OpenAI({
      apiKey: apiKey
    })
  }
  return openaiInstance
}
