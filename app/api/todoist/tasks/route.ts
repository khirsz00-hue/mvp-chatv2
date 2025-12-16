import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, addDays, isWithinInterval, parseISO, isBefore } from 'date-fns'

export const dynamic = 'force-dynamic'

// Shared function to process tasks with filtering
async function fetchAndFilterTasks(token: any, filter: string) {
  // Better token validation - return empty array for invalid tokens
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return []
  }

  try {
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error(`Todoist API error: ${res.status}`)
      // Return empty array instead of error to avoid breaking the UI
      return []
    }

    const allTasks = await res.json()

    // Lokalne zakresy dat (użytkownika)
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const tomorrowStart = startOfDay(addDays(now, 1))
    const tomorrowEnd = endOfDay(addDays(now, 1))
    const sevenDaysEnd = endOfDay(addDays(todayStart, 6))

    const filtered = allTasks.filter((t: any) => {
      // unify due source: Todoist may return object with .date or a string
      const dueStr = t?.due?.date || t?.due || null
      if (!dueStr) {
        // show tasks without due only when filter == all
        return filter === 'all'
      }

      // parse date (prefer parseISO for date-only strings)
      let dueDate: Date
      try {
        dueDate = parseISO(dueStr)
      } catch (e) {
        console.warn('⚠️ Failed to parse date with parseISO, falling back to Date constructor:', dueStr, e)
        dueDate = new Date(dueStr)
      }

      switch (filter) {
        case 'today':
          return dueDate >= todayStart && dueDate <= todayEnd
        case 'tomorrow':
          return dueDate >= tomorrowStart && dueDate <= tomorrowEnd
        case 'overdue':
          return isBefore(dueDate, todayStart)
        case '7 days':
        case 'week':
          return isWithinInterval(dueDate, { start: todayStart, end: sevenDaysEnd })
        case 'all':
        default:
          return true
      }
    })

    // zwracamy due w formacie oczekiwanym przez UI: { date: 'YYYY-MM-DD' } lub null
    const simplified = filtered.map((t: any) => ({
      id: t.id,
      content: t.content,
      description: t.description || null,
      project_id: t.project_id,
      due: t.due ? { date: t.due.date || t.due } : null,
      priority: t.priority,
      labels: t.labels || [],
      duration: t.duration || null,
    }))

    return simplified
  } catch (error: any) {
    console.error('❌ Błąd w /api/todoist/tasks:', error)
    // Return empty array instead of error to avoid breaking the UI
    return []
  }
}

// POST handler - more secure as token is in body
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, filter = 'all' } = body

    const tasks = await fetchAndFilterTasks(token, filter.toLowerCase())
    return NextResponse.json({ tasks })
  } catch (error: any) {
    console.error('❌ Błąd w /api/todoist/tasks POST:', error)
    return NextResponse.json({ tasks: [] })
  }
}

// GET handler - kept for backward compatibility
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') || ''
  const filter = (searchParams.get('filter') || 'all').toLowerCase()

  const tasks = await fetchAndFilterTasks(token, filter)
  return NextResponse.json({ tasks })
}
