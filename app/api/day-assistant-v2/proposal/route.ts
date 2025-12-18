/**
 * API Route: /api/day-assistant-v2/proposal
 * POST: Respond to a proposal (accept/reject)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getOrCreateDayAssistantV2,
  respondToProposal,
  updateTask
} from '@/lib/services/dayAssistantV2Service'
import { supabaseServer } from '@/lib/supabaseServer'
import type { Proposal, ProposalAction } from '@/lib/types/dayAssistantV2'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { proposal_id, action, alternative_index } = body
    
    if (!proposal_id || !action) {
      return NextResponse.json(
        { error: 'proposal_id and action are required' },
        { status: 400 }
      )
    }
    
    // Get assistant
    const assistant = await getOrCreateDayAssistantV2(user.id)
    if (!assistant) {
      return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 })
    }
    
    // Get proposal details first
    const { data: proposal, error: proposalError } = await supabaseServer
      .from('day_assistant_v2_proposals')
      .select('*')
      .eq('id', proposal_id)
      .single()
    
    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }
    
    const proposalData = proposal as Proposal
    
    // Apply action if accepted
    let appliedActions = 0
    if (action === 'accept_primary' || action === 'accept_alt') {
      const actionToApply: ProposalAction = 
        action === 'accept_primary' 
          ? proposalData.primary_action 
          : proposalData.alternatives[alternative_index || 0]
      
      if (actionToApply) {
        const applied = await applyProposalAction(actionToApply)
        if (applied) appliedActions++
      }
    }
    
    // Update proposal status
    const result = await respondToProposal(proposal_id, action, alternative_index)
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      applied_actions: appliedActions,
      message: action === 'reject' 
        ? 'Propozycja odrzucona' 
        : 'Propozycja zaakceptowana i zastosowana'
    })
  } catch (error) {
    console.error('Error in POST /api/day-assistant-v2/proposal:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Apply a proposal action to tasks
 */
async function applyProposalAction(action: ProposalAction): Promise<boolean> {
  try {
    switch (action.type) {
      case 'move_task':
        if (action.task_id && action.to_date) {
          await updateTask(action.task_id, {
            due_date: action.to_date
          })
          return true
        }
        break
      
      case 'reserve_morning':
        // TODO: Implement morning slot reservation in day plan blocks
        console.log('Morning slot reservation not yet implemented')
        return true
      
      case 'decompose_task':
        // TODO: Trigger AI decomposition
        console.log('Task decomposition not yet implemented')
        return true
      
      case 'swap_tasks':
        // TODO: Implement task swapping
        console.log('Task swapping not yet implemented')
        return true
    }
    
    return false
  } catch (error) {
    console.error('Error applying proposal action:', error)
    return false
  }
}
