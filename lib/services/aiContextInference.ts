/**
 * AI Context Inference Service
 * Uses AI to determine work context category when no project is assigned
 * Part of Day Assistant V2 Complete Overhaul
 */

// Check if OpenAI is available
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

/**
 * Infer context from task title and description using AI
 */
export async function inferContextFromAI(
  title: string,
  description: string | null
): Promise<string> {
  // If no OpenAI key, return default
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not found, using default context')
    return 'code'
  }

  const prompt = `
Based on this task, determine the work context category.
Choose ONE from: IT, KAMPANIE, PRYWATNE, SPOTKANIA, code, deep_work, maintenance, communication

Task: ${title}
Description: ${description || 'N/A'}

Return ONLY the category name, nothing else.
  `.trim()

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 20
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const context = data.choices?.[0]?.message?.content?.trim() || 'code'
    
    console.log(`🤖 AI inferred context for "${title}": ${context}`)
    return context
  } catch (error) {
    console.error('AI context inference failed:', error)
    return 'code' // Fallback
  }
}

/**
 * Batch infer contexts for multiple tasks
 */
export async function inferContextsBatch(
  tasks: Array<{ title: string; description: string | null }>
): Promise<string[]> {
  // Process in parallel with a reasonable limit
  const MAX_CONCURRENT = 5
  const results: string[] = []
  
  for (let i = 0; i < tasks.length; i += MAX_CONCURRENT) {
    const batch = tasks.slice(i, i + MAX_CONCURRENT)
    const batchResults = await Promise.all(
      batch.map(task => inferContextFromAI(task.title, task.description))
    )
    results.push(...batchResults)
  }
  
  return results
}
