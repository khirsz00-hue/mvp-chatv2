import { NextRequest, NextResponse } from 'next/server'
import { checkUsageLimit, ResourceType } from '@/lib/usageTracking'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const resource = searchParams.get('resource') as ResourceType

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource type required' },
        { status: 400 }
      )
    }

    const result = await checkUsageLimit(user.id, resource)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error checking usage limit:', error)
    return NextResponse.json(
      { error: 'Failed to check usage limit' },
      { status: 500 }
    )
  }
}
