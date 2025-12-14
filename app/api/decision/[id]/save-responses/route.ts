import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { HatColor } from '@/src/features/decision-assistant/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { hatColor, responses } = body

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

    if (!hatColor || !responses) {
      return NextResponse.json(
        { error: 'Missing hatColor or responses' },
        { status: 400 }
      )
    }

    // Verify decision belongs to user
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

    // Save user responses as an event
    const { error: eventError } = await supabase
      .from('decision_events')
      .insert({
        decision_id: id,
        hat_color: hatColor as HatColor,
        event_type: 'user_input',
        content: JSON.stringify(responses)
      })

    if (eventError) {
      console.error('Error saving event:', eventError)
      throw new Error(`Failed to save responses: ${eventError.message}`)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('Error in /api/decision/[id]/save-responses:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to save responses' },
      { status: 500 }
    )
  }
}
