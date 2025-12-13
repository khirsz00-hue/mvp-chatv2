import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'

export async function POST(req: Request) {
  try {
    const { messages, jsonMode } = await req.json()
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing or invalid messages' }, { status: 400 })
    }
    
    const openai = getOpenAIClient()
    
    const completionOptions = {
      model: 'gpt-4o-mini' as const,
      messages: messages,
      temperature: 0.7,
      ...(jsonMode && { response_format: { type: 'json_object' as const } })
    }
    
    const completion = await openai.chat.completions.create(completionOptions)
    
    const response = completion.choices[0].message.content || ''
    
    return NextResponse.json({ response })
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
