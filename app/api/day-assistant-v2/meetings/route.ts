import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleCalendarService } from '@/lib/googleCalendar'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const CACHE_TTL_MINUTES = 10 // Cache na 10 minut

interface Meeting {
  id: string
  google_event_id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  location?: string
  meeting_link?: string
  metadata?: any
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const forceRefresh = searchParams.get('force') === 'true'

    // Auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Meetings API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 [Meetings API] Request for date:', date, 'force:', forceRefresh)

    // Get assistant_id
    const { data: assistant } = await supabase
      .from('assistant_config')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'asystent dnia v2')
      .single()

    if (!assistant) {
      console.error('❌ [Meetings API] Assistant not found for user:', user.id)
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    // Check cache (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('day_assistant_v2_meetings')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('start_time', { ascending: true })

      if (cached && cached.length > 0) {
        const cacheAge = Date.now() - new Date(cached[0].updated_at).getTime()
        const cacheAgeMinutes = cacheAge / 1000 / 60

        if (cacheAgeMinutes < CACHE_TTL_MINUTES) {
          console.log(`✅ [Meetings API] Using cache (age: ${Math.round(cacheAgeMinutes)}min)`)
          return NextResponse.json({ meetings: cached, cached: true })
        }
      }
    }

    // Fetch from Google Calendar
    console.log('🔍 [Meetings API] Fetching from Google Calendar')
    const calendarService = await GoogleCalendarService.forUser(user.id)

    if (!calendarService) {
      console.log('⚠️ [Meetings API] Google Calendar not connected')
      return NextResponse.json({ 
        meetings: [], 
        error: 'Google Calendar not connected',
        cached: false 
      })
    }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    console.log(`🔍 [Meetings API] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

    const events = await calendarService.listEvents({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      maxResults: 50
    })

    console.log(`🔍 [Meetings API] Found ${events.length} events from Google Calendar`)
    events.forEach((event, idx) => {
      const isAllDay = !event.start?.dateTime
      const timeInfo = isAllDay ? 'ALL-DAY' : `${event.start?.dateTime} to ${event.end?.dateTime}`
      console.log(`  Event ${idx + 1}: "${event.summary}" - ${timeInfo}`)
    })

    // Transform and save to cache
    const meetings: Meeting[] = []
    
    // Delete old cache for this date
    await supabase
      .from('day_assistant_v2_meetings')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date)

    for (const event of events) {
      // Obsłuż zarówno wydarzenia z czasem jak i całodniowe
      const startDateTime = event.start?.dateTime || event.start?.date
      const endDateTime = event.end?.dateTime || event.end?.date

      if (!startDateTime || !endDateTime) continue

      const isAllDay = !event.start?.dateTime // jeśli nie ma dateTime, to all-day event

      let startTime: Date
      let endTime: Date
      let durationMinutes: number

      if (isAllDay) {
        // Wydarzenie całodniowe - ustaw na cały dzień
        startTime = new Date(startDateTime)
        startTime.setHours(0, 0, 0, 0)
        
        endTime = new Date(endDateTime)
        // Set to last millisecond of the day (23:59:59.999) to cover entire day
        endTime.setHours(23, 59, 59, 999)
        
        durationMinutes = 1440 // cały dzień = 24h = 1440 min
      } else {
        // Wydarzenie z konkretnym czasem
        startTime = new Date(startDateTime)
        endTime = new Date(endDateTime)
        durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60)
      }

      const meeting = {
        user_id: user.id,
        assistant_id: assistant.id,
        date,
        google_event_id: event.id!,
        title: event.summary || 'Bez tytułu',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        location: event.location || null,
        // Prefer hangoutLink (Google Meet) if available, otherwise use htmlLink
        // hangoutLink is specifically for video meetings, htmlLink is the general event URL
        meeting_link: event.hangoutLink || event.htmlLink || null,
        metadata: {
          description: event.description || null,
          attendees: event.attendees?.map((att: any) => ({
            email: att.email,
            displayName: att.displayName || att.email?.split('@')[0],
            responseStatus: att.responseStatus,
            self: att.self || false
          })) || [],
          hasVideoCall: !!event.hangoutLink,
          platform: event.hangoutLink ? 'Google Meet' : 
                    event.conferenceData?.entryPoints?.[0]?.label || 
                    (event.location?.includes('zoom') || event.location?.includes('Zoom')) ? 'Zoom' : 
                    event.location ? 'Room' : null,
          isAllDay: isAllDay
        }
      }

      const { data: inserted } = await supabase
        .from('day_assistant_v2_meetings')
        .insert(meeting)
        .select()
        .single()

      if (inserted) {
        meetings.push(inserted as Meeting)
      }
    }

    console.log(`✅ [Meetings API] Cached ${meetings.length} meetings`)
    return NextResponse.json({ meetings, cached: false })

  } catch (error: any) {
    console.error('❌ [Meetings API] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch meetings',
      meetings: []
    }, { status: 500 })
  }
}
