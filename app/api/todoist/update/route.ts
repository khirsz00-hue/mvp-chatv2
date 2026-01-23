import { NextResponse } from 'next/server'

interface TodoistUpdatePayload {
  content?: string
  description?: string
  priority?: number
  project_id?: string
  labels?: string[]
  due_string?: string
  due_date?: string | null  // ✅ Only due_date is accepted for updates (YYYY-MM-DD)
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
    // ✅ POPRAWKA: Handle due date properly - use due_date (not due_string) for updates
    if (updates.due !== undefined) {
      if (updates.due === null) {
        // Remove due date - Todoist API requires "no date" string
        updatePayload.due_string = "no date"
      } else if (typeof updates.due === 'string') {
        // Validate format YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due)) {
          updatePayload.due_date = updates.due
        } else {
          console.warn('⚠️ [Todoist Update] Invalid due date format:', updates.due)
        }
      } else if (updates.due && typeof updates.due === 'object' && updates.due.date) {
        // Extract date from object
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due.date)) {
          updatePayload.due_date = updates.due.date
        } else {
          console.warn('⚠️ [Todoist Update] Invalid due date format:', updates.due.date)
        }
      }
    }
    
    // ✅ FIX: Handle due_string if passed directly (convert YYYY-MM-DD to due_date)
    // Todoist API requires due_date for date-only format, due_string for natural language
    if (updates.due_string !== undefined) {
      if (typeof updates.due_string === 'string') {
        // Check if it's in YYYY-MM-DD format - should use due_date instead
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due_string)) {
          console.warn('⚠️ [Todoist Update] Converting due_string with date format to due_date:', updates.due_string)
          updatePayload.due_date = updates.due_string
          // Don't set due_string to avoid sending both
        } else {
          // Natural language string like "today", "tomorrow", "no date"
          updatePayload.due_string = updates.due_string
        }
      }
    }
    
    // Validate that we have at least one field to update
    if (Object.keys(updatePayload).length === 0) {
      console.error('❌ [Todoist Update] No valid update fields provided')
      return NextResponse.json({ 
        error: 'No valid update fields provided. Please specify at least one field to update.' 
      }, { status: 400 })
    }

    console.log('📝 [Todoist Update] Sending payload:', JSON.stringify(updatePayload))

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
      console.error('❌ [Todoist Update] API error:', errorText)
      console.error('❌ [Todoist Update] Failed payload:', JSON.stringify(updatePayload))
      console.error('❌ [Todoist Update] Task ID:', id)
      
      // Parse error details if possible
      let errorMessage = 'Nie udało się zaktualizować zadania'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          errorMessage = `Bad Todoist UPDATE: ${errorJson.error}`
        }
      } catch {
        // If not JSON, use the raw text
        if (errorText) {
          errorMessage = `Bad Todoist UPDATE: ${errorText}`
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: { taskId: id, payload: updatePayload }
      }, { status: res.status })
    }

    const updatedTask = await res.json()
    console.log('✅ [Todoist Update] Success:', updatedTask.id)

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (err: any) {
    console.error('❌ [Todoist Update] Error:', err)
    return NextResponse.json({ error: err.message || 'Błąd serwera' }, { status: 500 })
  }
}
