import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'

export const dynamic = 'force-dynamic'

/**
 * Update user password
 * Allows authenticated users to change their password
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    console.log(`[UpdatePassword] Updating password for user: ${user.id.substring(0, 8)}...`)

    // Update the user's password
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      console.error('[UpdatePassword] ✗ Error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log(`[UpdatePassword] ✓ Password updated successfully for user: ${user.id.substring(0, 8)}...`)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })
  } catch (error: any) {
    console.error('[UpdatePassword] ✗ Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update password' },
      { status: 500 }
    )
  }
}
