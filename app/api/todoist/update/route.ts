import { NextResponse } from 'next/server'

interface TodoistUpdatePayload {
  content?: string
  description?: string
  priority?: number
  project_id?: string
  labels?: string[]
  due_string?: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, token, ...updates } = body

    if (!id || !token) {
      return NextResponse.json({ error: 'Brak wymaganych parametrów' }, { status: 400 })
    }

    // Build update payload for Todoist API
    const updatePayload: TodoistUpdatePayload = {}
    
    if (updates.content !== undefined) updatePayload.content = updates.content
    if (updates.description !== undefined) updatePayload.description = updates.description
    if (updates.priority !== undefined) updatePayload.priority = updates.priority
    if (updates.project_id !== undefined) updatePayload.project_id = updates.project_id
    if (updates.labels !== undefined) updatePayload.labels = updates.labels
    
    // Handle due date - convert to string format if it's an object
    if (updates.due !== undefined) {
      if (typeof updates.due === 'string') {
        updatePayload.due_string = updates.due
      } else if (updates.due && typeof updates.due === 'object' && updates.due.date) {
        updatePayload.due_string = updates.due.date
      }
    }

    const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('❌ Błąd Todoist UPDATE:', errorText)
      return NextResponse.json({ error: 'Nie udało się zaktualizować zadania' }, { status: res.status })
    }

    const updatedTask = await res.json()

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (err: any) {
    console.error('❌ UPDATE error:', err)
    return NextResponse.json({ error: err.message || 'Błąd serwera' }, { status: 500 })
  }
}
