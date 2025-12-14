import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    const { data: decisions, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching decisions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch decisions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ decisions: decisions || [] })
  } catch (err: any) {
    console.error('Error in /api/decision/list:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch decisions' },
      { status: 500 }
    )
  }
}
