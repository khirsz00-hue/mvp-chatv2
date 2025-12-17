import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { MIN_PASSWORD_LENGTH } from '@/lib/authConstants'

export const dynamic = 'force-dynamic'

/**
 * Update user password
 * Allows authenticated users to change their password
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
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

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Security audit log
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwarded || realIp || 'unknown'
    
    console.log(`[UpdatePassword] Password update attempt:`, {
      timestamp,
      userId: user.id.substring(0, 8) + '...',
      email: user.email,
      ipAddress,
      userAgent: userAgent.substring(0, 100) + '...'
    })

    // Update the user's password
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      console.error('[UpdatePassword] ✗ Password update failed:', {
        timestamp,
        userId: user.id.substring(0, 8) + '...',
        error: error.message,
        ipAddress
      })
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log(`[UpdatePassword] ✓ Password updated successfully:`, {
      timestamp,
      userId: user.id.substring(0, 8) + '...',
      email: user.email,
      ipAddress
    })

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
