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

    // Make sure decision exists and belongs to user
    const { data: existingDecision, error: fetchError } = await supabase
      .from('decisions')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      throw new Error(`Failed to fetch decision: ${fetchError.message}`)
    }

    if (!existingDecision) {
      return NextResponse.json(
        { error: 'Decision not found or access denied' },
        { status: 404 }
      )
    }

    // Backup related rows for a best-effort rollback if something fails midway
    const [
      { data: eventsBackup, error: eventsBackupError },
      { data: optionsBackup, error: optionsBackupError }
    ] = await Promise.all([
      supabase.from('decision_events').select('*').eq('decision_id', params.id),
      supabase.from('decision_options').select('*').eq('decision_id', params.id)
    ])

    if (eventsBackupError || optionsBackupError) {
      throw new Error('Failed to backup related records before deletion')
    }

    const restoreEvents = async (): Promise<boolean> => {
      if (!eventsBackup?.length) return true
      const { error } = await supabase.from('decision_events').insert(eventsBackup)
      if (error) {
        console.error('Rollback failed for decision_events:', error)
        return false
      }
      return true
    }

    const restoreOptions = async (): Promise<boolean> => {
      if (!optionsBackup?.length) return true
      const { error } = await supabase.from('decision_options').insert(optionsBackup)
      if (error) {
        console.error('Rollback failed for decision_options:', error)
        return false
      }
      return true
    }

    const attemptRollback = async (
      shouldRestoreEvents: boolean,
      shouldRestoreOptions: boolean
    ): Promise<boolean> => {
      const tasks: Array<Promise<boolean>> = []
      if (shouldRestoreEvents) {
        tasks.push(restoreEvents())
      }
      if (shouldRestoreOptions) {
        tasks.push(restoreOptions())
      }
      if (tasks.length === 0) return true
      const results = await Promise.all(tasks)
      return results.every(Boolean)
    }

    let eventsDeleted = false
    let optionsDeleted = false

    // Clean up related data first to avoid constraint errors
    const { error: eventsError } = await supabase
      .from('decision_events')
      .delete()
      .eq('decision_id', params.id)

    if (eventsError) {
      throw new Error(`Failed to delete decision events: ${eventsError.message}`)
    }
    eventsDeleted = true

    const { error: optionsError } = await supabase
      .from('decision_options')
      .delete()
      .eq('decision_id', params.id)

    if (optionsError) {
      const rollbackSucceeded = await attemptRollback(eventsDeleted, optionsDeleted)
      const rollbackNote = rollbackSucceeded ? '' : ' (rollback may be incomplete)'
      throw new Error(`Failed to delete decision options: ${optionsError.message}${rollbackNote}`)
    }
    optionsDeleted = true

    // Finally delete decision using authenticated client
    const { data, error } = await supabase
      .from('decisions')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()

    if (error) {
      const rollbackSucceeded = await attemptRollback(eventsDeleted, optionsDeleted)
      const rollbackNote = rollbackSucceeded ? '' : ' (rollback may be incomplete)'
      throw new Error(`Failed to delete decision: ${error.message}${rollbackNote}`)
    }

    // Verify that a decision was actually deleted
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Decision not found or access denied' },
        { status: 404 }
      )
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
