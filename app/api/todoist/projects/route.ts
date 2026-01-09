import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchWithRetry } from '@/lib/utils/networkUtils'

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
      console.error('❌ [Todoist Projects API] Authentication failed:', authError?.message)
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Musisz być zalogowany'
      }, { status: 401 })
    }
    
    console.log('✅ [Todoist Projects API] Authenticated user:', user.id)
    
    // Get Todoist token from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('todoist_token')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('❌ [Todoist Projects API] Error fetching profile:', profileError.message)
      return NextResponse.json({ 
        error: 'Database error',
        message: 'Nie można pobrać profilu użytkownika',
        projects: [] 
      }, { status: 500 })
    }
    
    if (!profile?.todoist_token) {
      console.log('⚠️ [Todoist Projects API] No Todoist token found for user')
      return NextResponse.json({ 
        error: 'No token',
        message: 'Połącz się z Todoist aby zobaczyć projekty',
        projects: [] 
      }, { status: 200 })
    }
    
    console.log('🔍 [Todoist Projects API] Fetching projects from Todoist')
    
    // Fetch projects from Todoist API with retry logic
    let response: Response
    try {
      response = await fetchWithRetry('https://api.todoist.com/rest/v2/projects', {
        headers: {
          'Authorization': `Bearer ${profile.todoist_token}`
        }
      })
    } catch (fetchError) {
      console.error('❌ [Todoist Projects API] Network error:', fetchError)
      return NextResponse.json({ 
        error: 'Network error',
        message: 'Nie można połączyć się z Todoist. Spróbuj ponownie.',
        projects: [] 
      }, { status: 503 })
    }
    
    if (!response.ok) {
      console.error('❌ [Todoist Projects API] Todoist API error:', response.status, response.statusText)
      
      // Handle token expiry
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Token expired',
          message: 'Twój token Todoist wygasł. Połącz się ponownie.',
          projects: [] 
        }, { status: 401 })
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        return NextResponse.json({ 
          error: 'Rate limit',
          message: 'Zbyt wiele zapytań do Todoist. Spróbuj za chwilę.',
          projects: [] 
        }, { status: 429 })
      }
      
      return NextResponse.json({ 
        error: 'API error',
        message: `Todoist API zwrócił błąd ${response.status}`,
        projects: [] 
      }, { status: response.status })
    }
    
    const projects = await response.json()
    console.log(`✅ [Todoist Projects API] Fetched ${projects.length} projects`)
    
    return NextResponse.json({ 
      projects: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        color: p.color
      }))
    })
  } catch (error) {
    console.error('❌ [Todoist Projects API] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal error',
      message: 'Wystąpił nieoczekiwany błąd',
      projects: [] 
    }, { status: 500 })
  }
}
