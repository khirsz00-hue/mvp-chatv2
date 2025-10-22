import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    // prefer token z header Authorization: Bearer <token>, jeżeli nie ma w ciele
    const authHeader = (req.headers as any).get ? (req.headers as any).get('authorization') : (req.headers as any)['authorization']
    const headerToken = authHeader ? String(authHeader).replace(/^Bearer\s+/i, '') : null
    const { content, token: bodyToken, due, project_id, description } = body as any
    const token = bodyToken || headerToken
    if (!content || !token) return NextResponse.json({ error: 'Brak content lub token' }, { status: 400 })

    const payload: any = { content }
    if (project_id) payload.project_id = project_id
    if (due) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(due)) payload.due_date = due
      else payload.due_string = due
    }
    if (description) payload.description = description

    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      // zwróć body Todoist w odpowiedzi żeby frontend mógł zobaczyć szczegóły błędu
      return NextResponse.json({ error: 'Todoist error', detail: txt }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, task: data })
  } catch (err) {
    console.error('add task route error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
