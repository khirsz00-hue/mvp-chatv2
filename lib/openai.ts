import OpenAI from 'openai'

let openaiInstance: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY
    
    // During build time, use a dummy key to prevent errors
    // In production runtime, this will throw a proper error if key is missing
    if (!apiKey && process.env.NODE_ENV !== 'production') {
      // Build time fallback
      openaiInstance = new OpenAI({
        apiKey: 'dummy-key-for-build'
      })
    } else {
      openaiInstance = new OpenAI({
        apiKey: apiKey
      })
    }
  }
  return openaiInstance
}
