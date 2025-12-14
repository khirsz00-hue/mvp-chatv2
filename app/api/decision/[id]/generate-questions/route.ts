import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AIService } from '@/src/features/decision-assistant/services/aiService'
import { HatColor } from '@/src/features/decision-assistant/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { hatColor } = body

    // Get auth token from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    // Create Supabase client with user's token
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!hatColor) {
      return NextResponse.json(
        { error: 'Missing hatColor' },
        { status: 400 }
      )
    }

    // Get decision
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (decisionError || !decision) {
      return NextResponse.json(
        { error: 'Decision not found' },
        { status: 404 }
      )
    }

    // Get options
    const { data: options } = await supabase
      .from('decision_options')
      .select('*')
      .eq('decision_id', id)
      .order('order', { ascending: true })

    // Generate questions using AI
    const questions = await AIService.generateQuestionsForHat(
      decision.title,
      decision.description,
      options || [],
      hatColor as HatColor
    )

    return NextResponse.json({ questions }, { status: 200 })
  } catch (err: any) {
    console.error('Error in /api/decision/[id]/generate-questions:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
