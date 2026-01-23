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
    
    // ✅ FIX: Handle due date - use due_string for setting and clearing
    if (updates.due !== undefined) {
      if (updates.due === null) {
        // Remove due date - Todoist API requires "no date" string
        updatePayload.due_string = "no date"
      } else if (typeof updates.due === 'string') {
        // Validate format YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due)) {
          updatePayload.due_string = updates.due
        } else {
          console.warn('⚠️ [Todoist Update] Invalid due date format:', updates.due)
        }
      } else if (updates.due && typeof updates.due === 'object' && updates.due.date) {
        // Extract date from object
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due.date)) {
          updatePayload.due_string = updates.due.date
        } else {
          console.warn('⚠️ [Todoist Update] Invalid due date format in object:', updates.due.date)
        }
      }
    }

    console.log('📝 [Todoist Update] Payload:', JSON.stringify(updatePayload))

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
      console.error('❌ Failed payload was:', JSON.stringify(updatePayload))
      return NextResponse.json({ error: 'Nie udało się zaktualizować zadania' }, { status: res.status })
    }

    const updatedTask = await res.json()
    console.log('✅ [Todoist Update] Success:', updatedTask.id)

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (err: any) {
    console.error('❌ UPDATE error:', err)
    return NextResponse.json({ error: err.message || 'Błąd serwera' }, { status: 500 })
  }
}
