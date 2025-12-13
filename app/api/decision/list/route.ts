import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET /api/decision/list - Get all decisions for authenticated user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { data: decisions, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching decisions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ decisions })
  } catch (err: any) {
    console.error('Error in /api/decision/list:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
