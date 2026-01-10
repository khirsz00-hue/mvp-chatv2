import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'

export const dynamic = 'force-dynamic'

interface Meeting {
  id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  location?: string
  meeting_link?: string
}

/**
 * Generate personalized tips based on user's tasks, meetings, and yesterday's performance
 */
function generatePersonalizedTips(
  todayTasks: any[], 
  meetings: Meeting[], 
  yesterdayStats: { completed: number; total: number }
): string[] {
  const tips: string[] = []
  
  // Tip 1: Based on yesterday's performance
  if (yesterdayStats.completed >= 5) {
    tips.push('🔥 Wczoraj ukończyłeś ' + yesterdayStats.completed + ' zadań! Kontynuuj momentum.')
  } else if (yesterdayStats.completed > 0 && yesterdayStats.completed < 5) {
    tips.push('👍 Każdy ukończony task to sukces. Dziś spróbuj zrobić jeszcze jeden więcej!')
  } else if (yesterdayStats.completed === 0 && todayTasks.length > 0) {
    tips.push('🌱 Nowy dzień, nowa szansa. Zacznij od czegoś małego.')
  }
  
  // Tip 2: Based on meetings vs focus time
  if (meetings.length > 3) {
    tips.push('📅 Dużo spotkań dziś - zarezerwuj 15 min przerwy między nimi.')
  } else if (meetings.length === 0 && todayTasks.length > 0) {
    tips.push('🧠 Brak spotkań = idealny czas na deep work.')
  }
  
  // Tip 3: Based on priorities
  const highPriorityCount = todayTasks.filter(t => t.priority <= 2).length
  if (highPriorityCount > 0) {
    tips.push(`⚡ ${highPriorityCount} ${highPriorityCount === 1 ? 'zadanie' : 'zadań'} high-priority - zacznij od nich przed 12:00.`)
  }
  
  // Tip 4: Based on cognitive load
  const hardTasks = todayTasks.filter(t => (t.cognitive_load || 3) >= 4)
  if (hardTasks.length > 0) {
    tips.push('🧠 Trudne zadania rób rano, gdy masz najwięcej energii.')
  } else if (todayTasks.length > 0) {
    const avgCognitiveLoad = todayTasks.reduce((sum, t) => sum + (t.cognitive_load || 3), 0) / todayTasks.length
    if (avgCognitiveLoad < 2.5) {
      tips.push('⚡ Lekkie zadania dzisiaj - możesz zrobić więcej niż myślisz!')
    }
  }
  
  // Tip 5: Based on postpone count
  const postponedTasks = todayTasks.filter(t => (t.postpone_count || 0) >= 3)
  if (postponedTasks.length > 0) {
    tips.push(`⚠️ ${postponedTasks.length} ${postponedTasks.length === 1 ? 'zadanie' : 'zadań'} przekładanych 3+ razy - wybierz jedno i zrób dziś!`)
  }
  
  // Tip 6: Based on task count
  if (todayTasks.length > 8) {
    tips.push("📋 Masz dziś dużo zadań. Może warto kilka przenieść na jutro?")
  } else if (todayTasks.length <= 3 && todayTasks.length > 0) {
    tips.push("✨ Spokojny dzień! Idealny moment na trudniejsze zadania.")
  }
  
  // Tip 7: Based on context clustering
  if (todayTasks.length >= 4) {
    const contexts = todayTasks.map(t => t.context_type).filter(Boolean)
    if (contexts.length >= 4) {
      const contextCounts = contexts.reduce((acc: any, c: string) => {
        acc[c] = (acc[c] || 0) + 1
        return acc
      }, {})
      const dominantContext = Object.keys(contextCounts).sort((a, b) => contextCounts[b] - contextCounts[a])[0]
      
      if (dominantContext && contextCounts[dominantContext] >= 4) {
        const contextEmojis: any = { 
          'deep': '💻', 
          'admin': '📝', 
          'comms': '✉️', 
          'ops': '📞', 
          'creative': '🎨' 
        }
        const emoji = contextEmojis[dominantContext] || '📁'
        tips.push(`${emoji} Dzisiaj głównie ${dominantContext} - świetny dzień na deep focus!`)
      }
    }
  }
  
  // Always ensure we have at least one tip
  if (tips.length === 0) {
    tips.push("💪 Świetnie! Zaczynamy nowy dzień!")
  }
  
  return tips.slice(0, 3) // Max 3 tips (as per requirements)
}

/**
 * POST /api/recap/summary
 * Returns a complete summary ready for text-to-speech with personalized tips and meetings
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token: fallbackToken } = body

    console.log('🔍 [Recap/Summary] Generating daily summary')

    // Create authenticated Supabase client
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      console.error('❌ [Recap/Summary] User not authenticated')
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Musisz być zalogowany',
        textToSpeak: '',
        tips: []
      }, { status: 401 })
    }

    // Get token from database if not provided
    let todoistToken = fallbackToken
    if (!todoistToken) {
      console.log('🔍 [Recap/Summary] Fetching token from database')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('todoist_token')
        .eq('id', user.id)
        .single()
      
      todoistToken = profile?.todoist_token
    }

    // Fetch data from both endpoints using the request's base URL
    const baseUrl = req.url.split('/api/')[0]
    
    // Get auth session to pass to sub-endpoints
    const { data: { session } } = await supabase.auth.getSession()
    const authHeader = session?.access_token ? `Bearer ${session.access_token}` : undefined
    
    const headers: HeadersInit = { 
      'Content-Type': 'application/json'
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
    
    const [yesterdayResponse, todayResponse] = await Promise.all([
      fetch(`${baseUrl}/api/recap/yesterday`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: todoistToken }),
        cache: 'no-store'
      }),
      fetch(`${baseUrl}/api/recap/today`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: todoistToken }),
        cache: 'no-store'
      })
    ])

    if (!yesterdayResponse.ok || !todayResponse.ok) {
      console.error('❌ [Recap/Summary] Failed to fetch recap data:', {
        yesterday: yesterdayResponse.status,
        today: todayResponse.status
      })
      
      // Handle token expiry
      if (yesterdayResponse.status === 401 || todayResponse.status === 401) {
        return NextResponse.json({ 
          error: 'Token expired',
          message: 'Twój token Todoist wygasł. Połącz się ponownie z Todoist.',
          textToSpeak: '',
          tips: []
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch recap data',
        message: 'Nie można pobrać danych do podsumowania',
        textToSpeak: '',
        tips: []
      }, { status: 500 })
    }

    const yesterdayData = await yesterdayResponse.json()
    const todayData = await todayResponse.json()

    // Fetch meetings from day-assistant-v2
    let meetings: Meeting[] = []
    try {
      const todayDate = new Date().toISOString().split('T')[0]
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const meetingsResponse = await fetch(`${baseUrl}/api/day-assistant-v2/meetings?date=${todayDate}`, {
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        })

        if (meetingsResponse.ok) {
          const meetingsData = await meetingsResponse.json()
          meetings = meetingsData.meetings || []
          console.log('✅ [Recap/Summary] Found', meetings.length, 'meetings')
        } else {
          console.warn('⚠️ [Recap/Summary] Failed to fetch meetings:', meetingsResponse.status)
        }
      }
    } catch (meetingsError) {
      console.warn('⚠️ [Recap/Summary] Failed to fetch meetings:', meetingsError)
      // Continue without meetings - graceful degradation
    }

    // Generate personalized tips with yesterday's performance data
    const tips = generatePersonalizedTips(todayData.tasks || [], meetings, yesterdayData.stats)

    // Build the text for speech
    const parts = ['Dzień dobry!']

    // Yesterday summary
    if (yesterdayData.stats.completed > 0) {
      parts.push(`Wczoraj ukończyłeś ${yesterdayData.stats.completed} ${
        yesterdayData.stats.completed === 1 ? 'zadanie' : 
        yesterdayData.stats.completed < 5 ? 'zadania' : 'zadań'
      }.`)

      if (yesterdayData.lastActiveTask) {
        parts.push(`Ostatnio pracowałeś nad: ${yesterdayData.lastActiveTask.content}.`)
      }
    } else {
      parts.push('Wczoraj nie ukończyłeś żadnych zadań - dzisiaj nowy start!')
    }

    // Meetings summary (if any)
    if (meetings.length > 0) {
      parts.push(`Dzisiaj masz ${meetings.length} ${
        meetings.length === 1 ? 'spotkanie' : 
        meetings.length < 5 ? 'spotkania' : 'spotkań'
      }.`)
      
      // Mention first meeting
      if (meetings[0]) {
        const meetingTime = new Date(meetings[0].start_time).toLocaleTimeString('pl-PL', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        parts.push(`Pierwsze spotkanie: ${meetings[0].title} o ${meetingTime}.`)
      }
    }

    // Today summary
    if (todayData.stats.total > 0) {
      parts.push(`Dzisiaj masz do zrobienia ${todayData.stats.total} ${
        todayData.stats.total === 1 ? 'zadanie' : 
        todayData.stats.total < 5 ? 'zadania' : 'zadań'
      }.`)

      if (todayData.focusTask && todayData.focusReason) {
        parts.push(`Sugeruję zacząć od: ${todayData.focusTask.content}. ${todayData.focusReason}.`)
      } else if (todayData.focusTask) {
        parts.push(`Sugeruję zacząć od: ${todayData.focusTask.content}.`)
      }
    } else {
      parts.push('Dzisiaj nie masz żadnych zaplanowanych zadań - dzień na inne rzeczy!')
    }

    // Add one personalized tip to TTS
    if (tips.length > 0) {
      // Remove emoji and special characters from tip for TTS
      // Keep letters, numbers, basic punctuation (.,!?), and spaces
      const tipForSpeech = tips[0].replace(/[^\p{L}\p{N}.,!?\s]/gu, '').trim()
      if (tipForSpeech) {
        parts.push(tipForSpeech)
      }
    }

    const textToSpeak = parts.join(' ')

    console.log('✅ [Recap/Summary] Summary generated with', tips.length, 'personalized tips')

    return NextResponse.json({
      textToSpeak,
      yesterdayData,
      todayData,
      meetings,
      tips
    })
  } catch (error) {
    console.error('❌ [Recap/Summary] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      textToSpeak: '',
      tips: []
    }, { status: 500 })
  }
}
