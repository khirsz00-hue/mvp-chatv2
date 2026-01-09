import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/recap/summary
 * Returns a complete summary ready for text-to-speech
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ 
        error: 'No Todoist token provided',
        textToSpeak: ''
      }, { status: 400 })
    }

    console.log('🔍 [Recap/Summary] Generating daily summary')

    // Fetch data from both endpoints using the request's base URL
    const baseUrl = req.url.split('/api/')[0]
    
    const [yesterdayResponse, todayResponse] = await Promise.all([
      fetch(`${baseUrl}/api/recap/yesterday?token=${encodeURIComponent(token)}`, {
        cache: 'no-store'
      }),
      fetch(`${baseUrl}/api/recap/today?token=${encodeURIComponent(token)}`, {
        cache: 'no-store'
      })
    ])

    if (!yesterdayResponse.ok || !todayResponse.ok) {
      console.error('❌ [Recap/Summary] Failed to fetch recap data')
      return NextResponse.json({ 
        error: 'Failed to fetch recap data',
        textToSpeak: ''
      }, { status: 500 })
    }

    const yesterdayData = await yesterdayResponse.json()
    const todayData = await todayResponse.json()

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
      parts.push('Wczoraj nie ukończyłeś żadnych zadań.')
    }

    // Today summary
    if (todayData.stats.total > 0) {
      parts.push(`Dzisiaj masz do zrobienia ${todayData.stats.total} ${
        todayData.stats.total === 1 ? 'zadanie' : 
        todayData.stats.total < 5 ? 'zadania' : 'zadań'
      }.`)

      if (todayData.focusTask) {
        parts.push(`Sugeruję zacząć od: ${todayData.focusTask.content}.`)
      }
    } else {
      parts.push('Dzisiaj nie masz żadnych zaplanowanych zadań.')
    }

    const textToSpeak = parts.join(' ')

    console.log('✅ [Recap/Summary] Summary generated:', textToSpeak.substring(0, 100) + '...')

    return NextResponse.json({
      textToSpeak,
      yesterdayData,
      todayData
    })
  } catch (error) {
    console.error('❌ [Recap/Summary] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      textToSpeak: ''
    }, { status: 500 })
  }
}
