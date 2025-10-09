import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const filter = searchParams.get('filter') || 'today'

  if (!token) {
    return NextResponse.json({ error: 'Brak tokenu Todoist' }, { status: 401 })
  }

  // Pobranie zadań z Todoist REST API
  const res = await fetch(`https://api.todoist.com/rest/v2/tasks?filter=${filter}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Błąd Todoist API: ${err}` }, { status: res.status })
  }

  const tasks = await res.json()

  // Sortujemy i zwracamy tylko podstawowe pola
  const simplified = tasks.map((t: any) => ({
    id: t.id,
    content: t.content,
    project_id: t.project_id,
    due: t.due?.date,
    priority: t.priority
  }))

  return NextResponse.json({ tasks: simplified })
}
