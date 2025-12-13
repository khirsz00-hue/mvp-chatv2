import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, addDays, isWithinInterval, parseISO, isBefore } from 'date-fns'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const filter = (searchParams.get('filter') || 'all').toLowerCase()
  const filter = (searchParams.get('filter') || 'today').toLowerCase()

  if (!token) {
    return NextResponse.json({ error: 'Brak tokenu Todoist' }, { status: 401 })
  }

  try {
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Błąd Todoist API: ${err}` }, { status: res.status })
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
      const dueStr = t?.due?.date || t?.due || null
      if (!dueStr) return filter === 'all'

      let dueDate: Date
      try { 
        dueDate = parseISO(dueStr) 
      } catch (e) { 
        console.warn('⚠️ Failed to parse date with parseISO, falling back to Date constructor:', dueStr, e)
        dueDate = new Date(dueStr) 
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
      } catch {
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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
