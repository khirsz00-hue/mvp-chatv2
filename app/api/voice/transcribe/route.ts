import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }
  
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = getOpenAIClient()

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pl'
    })

    // Parse transcription to extract task details
    const parsed = await parseVoiceInput(transcription.text, openai)

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Create task
    const today = new Date().toISOString().split('T')[0]
    
    const { data: task, error } = await supabase
      .from('day_assistant_v2_tasks')
      .insert({
        user_id: user.id,
        title: parsed.title,
        due_date: parsed.dueDate || today,
        context_type: parsed.context || 'deep_work',
        estimate_min: parsed.estimateMinutes || 25,
        cognitive_load: 2,
        priority: 3,
        source: 'voice_capture'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ [Voice API] Task creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ [Voice API] Task created from voice:', task.title)

    return NextResponse.json({
      task,
      transcription: transcription.text,
      parsed
    })
  } catch (error: any) {
    console.error('❌ [Voice API] Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to process voice input' },
      { status: 500 }
    )
  }
}

async function parseVoiceInput(text: string, openai: OpenAI) {
  // Use OpenAI to parse the voice input
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Jesteś asystentem parsującym polecenia głosowe dotyczące zadań.
        
Zwróć JSON:
{
  "title": "tytuł zadania (bez daty/czasu)",
  "dueDate": "YYYY-MM-DD lub null",
  "context": "deep_work | admin | communication | creative | null",
  "estimateMinutes": number lub null
}

Przykłady:
"Zadzwoń do mamy jutro o trzeciej" → {"title": "Zadzwoń do mamy", "dueDate": "JUTRO", "context": "communication", "estimateMinutes": 15}
"Napisz raport" → {"title": "Napisz raport", "dueDate": null, "context": "deep_work", "estimateMinutes": null}
`
      },
      { role: 'user', content: text }
    ],
    temperature: 0
  })

  const result = JSON.parse(completion.choices[0].message.content || '{}')

  // Convert relative dates
  if (result.dueDate === 'JUTRO') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    result.dueDate = tomorrow.toISOString().split('T')[0]
  } else if (result.dueDate === 'DZISIAJ') {
    result.dueDate = new Date().toISOString().split('T')[0]
  }

  return result
}
