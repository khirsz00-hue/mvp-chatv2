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

    // 🕒 Przygotuj zakresy dat lokalnych (PL)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const startOfToday = new Date(today)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59, 999)

    const startOfTomorrow = new Date(tomorrow)
    startOfTomorrow.setHours(0, 0, 0, 0)
    const endOfTomorrow = new Date(tomorrow)
    endOfTomorrow.setHours(23, 59, 59, 999)

    // 🧠 Filtrowanie lokalne zamiast API
    const filtered = allTasks.filter((t: any) => {
      const dueDate = t.due?.date ? new Date(t.due.date) : null

      switch (filter) {
        case 'today':
          return (
            dueDate &&
            dueDate.getTime() >= startOfToday.getTime() &&
            dueDate.getTime() <= endOfToday.getTime()
          )
        case 'tomorrow':
          return (
            dueDate &&
            dueDate.getTime() >= startOfTomorrow.getTime() &&
            dueDate.getTime() <= endOfTomorrow.getTime()
          )
        case 'overdue':
          return dueDate && dueDate.getTime() < startOfToday.getTime()
        case '7 days':
          const in7Days = new Date()
          in7Days.setDate(today.getDate() + 7)
          return dueDate && dueDate <= in7Days
        default:
          return true
      }
    })

    // 🎯 Upraszczamy dane do frontu
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
