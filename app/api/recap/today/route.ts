import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { getTodayTasks } from '@/lib/services/recapService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/recap/today
 * Returns tasks scheduled for today with focus task suggestion using advanced scoring
 * 
 * NOTE: This endpoint is kept for backward compatibility.
 * Business logic has been moved to @/lib/services/recapService
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token: fallbackToken } = body

    console.log('🔍 [Recap/Today] Starting request')

    // Create authenticated Supabase client
    const supabase = await createAuthenticatedSupabaseClient(req)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      console.error('❌ [Recap/Today] User not authenticated')
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Musisz być zalogowany',
        tasks: [],
        focusTask: null,
        stats: { total: 0, highPriority: 0 }
      }, { status: 401 })
    }

    // Use service layer for business logic
    try {
      const data = await getTodayTasks(supabase, user.id, fallbackToken)
      return NextResponse.json(data)
    } catch (serviceError: any) {
      console.error('❌ [Recap/Today] Service error:', serviceError)
      
      // Handle token expiry
      if (serviceError.message === 'Token expired') {
        return NextResponse.json({ 
          error: 'Token expired',
          message: 'Twój token Todoist wygasł. Połącz się ponownie z Todoist.',
          tasks: [],
          focusTask: null,
          stats: { total: 0, highPriority: 0 }
        }, { status: 401 })
      }
      
      throw serviceError
    }
  } catch (error) {
    console.error('❌ [Recap/Today] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      tasks: [],
      focusTask: null,
      stats: { total: 0, highPriority: 0 }
    }, { status: 500 })
  }
}
