import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, addDays, isWithinInterval, parseISO, isBefore } from 'date-fns'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const filter = (searchParams.get('filter') || 'all').toLowerCase()

  // Better token validation - return empty array for invalid tokens
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return NextResponse.json({ tasks: [] })
  }

  try {
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error(`Todoist API error: ${res.status}`)
      // Return empty array instead of error to avoid breaking the UI
      return NextResponse.json({ tasks: [] })
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
      project_id: t.project_id,
      due: t.due ? { date: t.due.date || t.due } : null,
      priority: t.priority,
    }))

    return NextResponse.json({ tasks: simplified })
  } catch (error: any) {
    console.error('❌ Błąd w /api/todoist/tasks:', error)
    // Return empty array instead of error to avoid breaking the UI
    return NextResponse.json({ tasks: [] })
  }
}
