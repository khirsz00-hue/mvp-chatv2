import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch timer sessions for this task
    const { data: sessions, error } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('task_id', params.taskId)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
    
    if (error) throw error
    
    // Format for UniversalTaskModal
    const formatted = sessions?.map(s => ({
      id: s.id,
      duration: s.duration_seconds ? Math.floor(s.duration_seconds / 60) : 0,
      date: new Date(s.started_at).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      sessionType: s.session_type
    })) || []
    
    return NextResponse.json({ sessions: formatted })
  } catch (error) {
    console.error('❌ Failed to fetch timer sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timer sessions' },
      { status: 500 }
    )
  }
}
