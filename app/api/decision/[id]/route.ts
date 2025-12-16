import { NextResponse } from 'next/server'
import { DecisionService } from '@/src/features/decision-assistant/services/decisionService'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await DecisionService.getDecision(params.id)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error in /api/decision/[id]:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to get decision' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    // Delete decision using authenticated client
    const { error } = await supabase
      .from('decisions')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to delete decision: ${error.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in /api/decision/[id] DELETE:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to delete decision' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const decision = await DecisionService.updateDecision(params.id, body)
    return NextResponse.json({ decision })
  } catch (err: any) {
    console.error('Error in /api/decision/[id] PATCH:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to update decision' },
      { status: 500 }
    )
  }
}
