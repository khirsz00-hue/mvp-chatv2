import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { content, token, due, project_id, description, parent_id, duration } = body
    if (!content || !token) return NextResponse.json({ error: 'Brak content lub token' }, { status: 400 })

    const payload: any = { content }
    if (project_id) payload.project_id = project_id
    if (parent_id) payload.parent_id = parent_id
    if (due) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(due)) payload.due_date = due
      else payload.due_string = due
    }
    if (description) payload.description = description
    if (duration) {
      payload.duration = duration
      payload.duration_unit = 'minute'
    }

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
      return NextResponse.json({ error: 'Todoist error: ' + txt }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, task: data })
  } catch (err) {
    console.error('add task route error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
