import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, addDays, isWithinInterval, parseISO, isBefore } from 'date-fns'

export const dynamic = 'force-dynamic'

// Shared function to process tasks with filtering
async function fetchAndFilterTasks(
  token: any,
  filter: string,
  date?: string,
  completedRange: 'recent' | 'all' = 'recent',
  searchTerm?: string
) {
  // Better token validation - return empty array for invalid tokens
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return []
  }

  const isCompletedOnDate = (completedAt: string, targetDate: Date | null) => {
    if (!targetDate) return false
    try {
      const completedDate = parseISO(completedAt)
      return isWithinInterval(completedDate, {
        start: startOfDay(targetDate),
        end: endOfDay(targetDate),
      })
    } catch {
      return false
    }
  }

  try {
    // Fetch completed tasks if filter is 'completed'
    if (filter === 'completed') {
      const res = await fetch('https://api.todoist.com/sync/v9/completed/get_all', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        cache: 'no-store',
      })

      if (!res.ok) {
        console.error(`Todoist Sync API error: ${res.status}`)
        return []
      }

      const data = await res.json()
      const completedTasks = data.items || []
      const targetDate = date ? parseISO(date) : null
      const now = new Date()
      const sevenDaysAgo = startOfDay(addDays(now, -6))
      const search = searchTerm ? searchTerm.toLowerCase() : ''
      
      const filteredCompleted = completedTasks.filter((t: any) => {
        if (!t.completed_at) return false
        
        // Date filtering
        if (targetDate) {
          return isCompletedOnDate(t.completed_at, targetDate)
        }
        if (completedRange === 'recent') {
          try {
            const completedDate = parseISO(t.completed_at)
            return isWithinInterval(completedDate, {
              start: sevenDaysAgo,
              end: endOfDay(now),
            })
          } catch {
            return false
          }
        }

        // completedRange === 'all'
        return true
      }).filter((t: any) => {
        if (!search) return true
        const haystack = `${t.content || ''} ${t.description || ''}`.toLowerCase()
        return haystack.includes(search)
      })
      
      // Map completed tasks to match the expected format
      const simplified = filteredCompleted.map((t: any) => ({
        id: t.task_id || t.id,
        content: t.content,
        description: t.description || null,
        project_id: t.project_id,
        due: t.due ? { date: t.due.date || t.due } : null,
        priority: t.priority || 4,
        labels: t.labels || [],
        duration: t.duration || null,
        completed: true,
        completed_at: t.completed_at || null,
      }))
      
      return simplified
    }
    
    // Fetch active tasks for other filters
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
    let now = new Date()
    if (date) {
      try {
        now = parseISO(date)
      } catch (e) {
        console.warn('⚠️ Invalid date provided to /api/todoist/tasks, falling back to today', date, e)
      }
    }
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const tomorrowStart = startOfDay(addDays(now, 1))
    const tomorrowEnd = endOfDay(addDays(now, 1))
    const sevenDaysEnd = endOfDay(addDays(todayStart, 6))

    const filtered = allTasks.filter((t: any) => {
      // Todoist REST v2 tasks list active (open) tasks; filter out any entries marked as completed to keep planned lists clean
      if (t?.completed === true || t?.is_completed === true || t?.completed_at) {
        return false
      }
      if (filter === 'overdue') {
        console.warn('[todoist/tasks] Deprecated filter "overdue" received, mapping to "scheduled"')
      }
      // Map legacy "overdue" filter to "scheduled" (overdue now handled together with planning)
      // TODO(Q2 2026): Remove this mapping once all callers send "scheduled" instead of "overdue"
      const effectiveFilter = filter === 'overdue' ? 'scheduled' : filter
      // unify due source: Todoist may return object with .date or a string
      const dueStr = t?.due?.date || t?.due || null
      if (effectiveFilter === 'scheduled' && !dueStr) return true
      if (!dueStr) return effectiveFilter === 'all'

      // parse date (prefer parseISO for date-only strings)
      let dueDate: Date
      try {
        dueDate = parseISO(dueStr)
      } catch (e) {
        console.warn('⚠️ Failed to parse date with parseISO, falling back to Date constructor:', dueStr, e)
        dueDate = new Date(dueStr)
      }

      if (effectiveFilter === 'scheduled') {
        return isBefore(dueDate, todayStart)
      }

      switch (effectiveFilter) {
        case 'today':
          return dueDate >= todayStart && dueDate <= todayEnd
        case 'tomorrow':
          return dueDate >= tomorrowStart && dueDate <= tomorrowEnd
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
      completed: false,
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
    const { token, filter = 'all', date, completedRange = 'recent', search } = body

    const tasks = await fetchAndFilterTasks(
      token,
      filter.toLowerCase(),
      date,
      completedRange,
      search
    )
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
  const date = searchParams.get('date') || undefined
  const completedRangeParam = searchParams.get('range') as 'recent' | 'all' | null
  const search = searchParams.get('q') || undefined
  const completedRange = completedRangeParam === 'all' ? 'all' : 'recent'

  const tasks = await fetchAndFilterTasks(token, filter, date, completedRange, search)
  return NextResponse.json({ tasks })
}
