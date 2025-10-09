import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const filter = searchParams.get('filter') || 'today'

  if (!token) {
    return NextResponse.json({ error: 'Brak tokenu Todoist' }, { status: 401 })
  }

  try {
    // ✅ Pobierz WSZYSTKIE zadania z Todoist (bez filtrowania po stronie API)
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Błąd Todoist API: ${err}` }, { status: res.status })
    }

    const allTasks = await res.json()

    // 🕒 Pomocnicza funkcja — konwersja daty UTC → lokalna (PL)
    const toLocalDate = (isoDate: string) => {
      const utcDate = new Date(isoDate)
      // Przesuń o offset strefy czasowej
      const localTime = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000)
      return localTime
    }

    // 📆 Zakresy lokalnych dat
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfToday.getDate() + 1)
    const endOfTomorrow = new Date(endOfToday)
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)

    const in7Days = new Date(startOfToday)
    in7Days.setDate(startOfToday.getDate() + 7)

    // 🧠 Filtrowanie po stronie backendu
    const filtered = allTasks.filter((t: any) => {
      if (!t.due?.date) return false
      const dueDate = toLocalDate(t.due.date)

      switch (filter) {
        case 'today':
          return dueDate >= startOfToday && dueDate <= endOfToday
        case 'tomorrow':
          return dueDate >= startOfTomorrow && dueDate <= endOfTomorrow
        case 'overdue':
          return dueDate < startOfToday
        case '7 days':
          return dueDate <= in7Days
        default:
          return true
      }
    })

    // 🎯 Upraszczamy dane dla frontu
    const simplified = filtered.map((t: any) => ({
      id: t.id,
      content: t.content,
      project_id: t.project_id,
      due: t.due?.date || null,
      priority: t.priority,
    }))

    return NextResponse.json({ tasks: simplified })
  } catch (error: any) {
    console.error('❌ Błąd w /api/todoist/tasks:', error)
    return NextResponse.json({ error: 'Nie udało się pobrać zadań' }, { status: 500 })
  }
}
