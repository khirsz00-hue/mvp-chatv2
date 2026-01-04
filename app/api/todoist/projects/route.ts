import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
      console.error('🔍 [Todoist Projects API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('🔍 [Todoist Projects API] Authenticated user:', user.id)
    
    // Get Todoist token from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('todoist_token')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('❌ [Todoist Projects API] Error fetching profile:', profileError)
      return NextResponse.json({ projects: [] })
    }
    
    if (!profile?.todoist_token) {
      console.log('⚠️ [Todoist Projects API] No Todoist token found for user')
      return NextResponse.json({ projects: [] })
    }
    
    console.log('🔍 [Todoist Projects API] Fetching projects from Todoist')
    
    // Fetch projects from Todoist API
    const response = await fetch('https://api.todoist.com/rest/v2/projects', {
      headers: {
        Authorization: `Bearer ${profile.todoist_token}`
      }
    })
    
    if (!response.ok) {
      console.error('❌ [Todoist Projects API] Failed to fetch Todoist projects:', response.status)
      return NextResponse.json({ projects: [] })
    }
    
    const projects = await response.json()
    console.log(`✅ [Todoist Projects API] Fetched ${projects.length} projects from Todoist`)
    
    return NextResponse.json({ 
      projects: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        color: p.color
      }))
    })
  } catch (error) {
    console.error('❌ [Todoist Projects API] Error:', error)
    return NextResponse.json({ projects: [] })
  }
}
