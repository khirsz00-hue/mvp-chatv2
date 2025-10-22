import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const filter = searchParams.get('filter') || 'today'

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

    // 🕒 Offset strefy czasowej (w milisekundach)
    const tzOffset = new Date().getTimezoneOffset() * 60000

    // 📆 Zakresy dni z uwzględnieniem offsetu
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // uwzględnij przesunięcie UTC — dla "today" traktuj dzień +2h tolerancji
    const todayStartUTC = new Date(todayStart.getTime() - tzOffset - 2 * 60 * 60 * 1000)
    const todayEndUTC = new Date(todayEnd.getTime() - tzOffset + 2 * 60 * 60 * 1000)

    const tomorrowStart = new Date(todayEnd)
    tomorrowStart.setDate(todayEnd.getDate() + 1)
    tomorrowStart.setHours(0, 0, 0, 0)
    const tomorrowEnd = new Date(tomorrowStart)
    tomorrowEnd.setHours(23, 59, 59, 999)

    const in7Days = new Date(todayStart)
    in7Days.setDate(todayStart.getDate() + 7)

    // 🧩 Filtrowanie
    const filtered = allTasks.filter((t: any) => {
      if (!t.due?.date) return false
      const due = new Date(t.due.date)

      switch (filter) {
        case 'today':
          return due >= todayStartUTC && due <= todayEndUTC
        case 'tomorrow':
          return due >= tomorrowStart && due <= tomorrowEnd
        case 'overdue':
          return due < todayStartUTC
        case '7 days':
          return due <= in7Days
        default:
          return true
      }
    })

    // 🎯 Upraszczamy dane — ZWRACAMY due JAKO OBIEKT { date: ... } (zgodnie z oczekiwaniem UI)
    const simplified = filtered.map((t: any) => ({
      id: t.id,
      content: t.content,
      project_id: t.project_id,
      due: t.due ? { date: t.due.date } : null,
      priority: t.priority,
    }))

    return NextResponse.json({ tasks: simplified })
  } catch (error: any) {
    console.error('❌ Błąd w /api/todoist/tasks:', error)
    return NextResponse.json({ error: 'Nie udało się pobrać zadań' }, { status: 500 })
  }
}