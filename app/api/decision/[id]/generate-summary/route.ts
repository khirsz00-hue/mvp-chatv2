import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AIService } from '@/src/features/decision-assistant/services/aiService'
import { filterRealUserInputEvents } from '@/src/features/decision-assistant/utils/validation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

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

    // Get all events
    const { data: events, error: eventsError } = await supabase
      .from('decision_events')
      .select('*')
      .eq('decision_id', id)
      .order('created_at', { ascending: true })

    if (eventsError) {
      throw new Error(`Failed to get events: ${eventsError.message}`)
    }

    // Filter only events with REAL user input (safety check)
    const userInputEvents = filterRealUserInputEvents(events || [])

    // Safety check (should not happen with frontend validation)
    if (userInputEvents.length === 0) {
      return NextResponse.json({ 
        error: 'Brak odpowiedzi użytkownika (to nie powinno się zdarzyć)',
        summary: {
          noAnswers: true,
          message: 'Błąd: brak odpowiedzi',
          perspectives: [],
          insights: [],
          recommendation: ''
        }
      }, { status: 400 })
    }

    // Generate summary using AI - pass ONLY real answers
    const summary = await AIService.generateSummary(
      decision.title,
      decision.description,
      options || [],
      userInputEvents
    )

    // Save summary as a synthesis event
    const { error: summaryError } = await supabase
      .from('decision_events')
      .insert({
        decision_id: id,
        hat_color: 'blue',
        event_type: 'synthesis',
        content: 'Final summary',
        ai_response: JSON.stringify(summary)
      })

    if (summaryError) {
      console.error('Error saving summary:', summaryError)
      // Don't throw - summary was generated, just log the error
    }

    return NextResponse.json({ summary }, { status: 200 })
  } catch (err: any) {
    console.error('Error in /api/decision/[id]/generate-summary:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
