/**
 * Context Inference Service
 * AI-powered context categorization for tasks
 */

import { getOpenAIClient } from '@/lib/openai'

export type TaskContext = 
  | 'deep_work'        // Deep focus coding, architecture, complex problem solving
  | 'communication'    // Meetings, emails, calls, Slack responses
  | 'admin'            // Bureaucracy, invoices, documentation, setup
  | 'creative'         // Design, writing, brainstorming, planning
  | 'learning'         // Reading docs, tutorials, research
  | 'maintenance'      // Bug fixes, code review, refactoring
  | 'personal'         // Personal errands, shopping, health
  | 'quick_wins'       // Small tasks < 15 min, easy completions

export interface ContextInference {
  context: TaskContext
  confidence: number
  reasoning: string
}

/**
 * Infer task context using AI (OpenAI GPT-4)
 */
export async function inferTaskContext(
  title: string,
  description?: string
): Promise<ContextInference> {
  try {
    const openai = getOpenAIClient()
    
    const prompt = `
Analyze this task and categorize it into ONE context:

Task: "${title}"
Description: ${description || 'No description'}

Available contexts:
- deep_work: Complex coding, architecture, deep problem solving (high cognitive load)
- communication: Meetings, emails, calls, team coordination
- admin: Bureaucracy, invoices, documentation, setup tasks
- creative: Design, writing, brainstorming, content creation
- learning: Reading docs, tutorials, courses, research
- maintenance: Bug fixes, code review, refactoring, testing
- personal: Personal errands, health, shopping, life admin
- quick_wins: Small tasks under 15 min, easy completions

Respond ONLY with valid JSON:
{
  "context": "chosen_context",
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a task categorization expert. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    
    return {
      context: result.context || 'deep_work',
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Default categorization'
    }
  } catch (error) {
    console.error('[Context Inference] Error:', error)
    // Fallback to simple keyword matching
    return fallbackInference(title, description)
  }
}

/**
 * Fallback inference using keyword matching when AI is unavailable
 */
function fallbackInference(title: string, description?: string): ContextInference {
  const text = `${title} ${description || ''}`.toLowerCase()
  
  if (text.match(/meeting|call|spotkanie|rozmowa|email|slack|zoom|teams/i)) {
    return { context: 'communication', confidence: 0.7, reasoning: 'Keyword match: communication' }
  }
  
  if (text.match(/invoice|faktura|dokumentacja|setup|config|admin/i)) {
    return { context: 'admin', confidence: 0.7, reasoning: 'Keyword match: admin' }
  }
  
  if (text.match(/design|napisać|content|brainstorm|creative|kreatywne/i)) {
    return { context: 'creative', confidence: 0.7, reasoning: 'Keyword match: creative' }
  }
  
  if (text.match(/learn|read|tutorial|research|study|nauka|czytać/i)) {
    return { context: 'learning', confidence: 0.7, reasoning: 'Keyword match: learning' }
  }
  
  if (text.match(/bug|fix|review|refactor|test|naprawa/i)) {
    return { context: 'maintenance', confidence: 0.7, reasoning: 'Keyword match: maintenance' }
  }
  
  if (text.match(/shopping|doctor|personal|errand|zakupy|osobiste|zdrowie/i)) {
    return { context: 'personal', confidence: 0.7, reasoning: 'Keyword match: personal' }
  }
  
  if (text.match(/quick|5\s*min|10\s*min|szybkie|krótkie/i)) {
    return { context: 'quick_wins', confidence: 0.7, reasoning: 'Keyword match: quick task' }
  }
  
  // Default to deep_work
  return { context: 'deep_work', confidence: 0.5, reasoning: 'Default categorization' }
}

/**
 * Context labels for UI display
 */
export const CONTEXT_LABELS: Record<TaskContext, string> = {
  deep_work: '🧠 Deep Work',
  communication: '💬 Komunikacja',
  admin: '📋 Admin',
  creative: '🎨 Kreatywne',
  learning: '📚 Nauka',
  maintenance: '🔧 Maintenance',
  personal: '🏠 Osobiste',
  quick_wins: '⚡ Quick Wins'
}

/**
 * Context colors for UI display
 */
export const CONTEXT_COLORS: Record<TaskContext, string> = {
  deep_work: 'bg-purple-500',
  communication: 'bg-blue-500',
  admin: 'bg-gray-500',
  creative: 'bg-pink-500',
  learning: 'bg-green-500',
  maintenance: 'bg-orange-500',
  personal: 'bg-indigo-500',
  quick_wins: 'bg-yellow-500'
}
