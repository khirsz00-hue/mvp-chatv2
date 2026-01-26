import { NextResponse } from 'next/server'

interface TodoistUpdatePayload {
  content?: string
  description?: string
  priority?: number
  labels?: string[]
  due_string?: string
  due_date?: string | null  // ✅ Only due_date is accepted for updates (YYYY-MM-DD)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, token, project_id: projectIdToMove, ...updates } = body

    if (!id || !token) {
      return NextResponse.json({ error: 'Brak wymaganych parametrów' }, { status: 400 })
    }

    const updatePayload: TodoistUpdatePayload = {}

    if (updates.content !== undefined) updatePayload.content = updates.content
    if (updates.description !== undefined) updatePayload.description = updates.description
    if (updates.priority !== undefined) updatePayload.priority = updates.priority
    if (updates.labels !== undefined) updatePayload.labels = updates.labels

    if (updates.due !== undefined) {
      if (updates.due === null) {
        updatePayload.due_string = 'no date'
      } else if (typeof updates.due === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due)) {
          updatePayload.due_date = updates.due
        } else {
          console.warn('⚠️ [Todoist Update] Invalid due date format:', updates.due)
        }
      } else if (updates.due && typeof updates.due === 'object' && updates.due.date) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due.date)) {
          updatePayload.due_date = updates.due.date
        } else {
          console.warn('⚠️ [Todoist Update] Invalid due date format:', updates.due.date)
        }
      }
    }

    if (updates.due_string !== undefined) {
      if (typeof updates.due_string === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due_string)) {
          console.warn('⚠️ [Todoist Update] Converting due_string with date format to due_date:', updates.due_string)
          updatePayload.due_date = updates.due_string
        } else {
          updatePayload.due_string = updates.due_string
        }
      }
    }

    const normalizedProjectId = (() => {
      if (projectIdToMove === undefined || projectIdToMove === null) return undefined
      if (typeof projectIdToMove === 'string') {
        const trimmed = projectIdToMove.trim()
        if (!trimmed || trimmed.toLowerCase() === 'none') return undefined
        return trimmed
      }
      return projectIdToMove
    })()

    const hasProjectMove = normalizedProjectId !== undefined
    const hasUpdateFields = Object.keys(updatePayload).length > 0

    if (!hasProjectMove && !hasUpdateFields) {
      console.error('❌ [Todoist Update] No valid update fields provided')
      return NextResponse.json({ 
        error: 'No valid update fields provided. Please specify at least one field to update.' 
      }, { status: 400 })
    }

    if (hasProjectMove) {
      const movePayload = { project_id: normalizedProjectId }
      const moveRes = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}/move`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(movePayload),
      })

      if (!moveRes.ok) {
        const errorText = await moveRes.text()
        console.error('❌ [Todoist Update] Move API error:', errorText)
        return NextResponse.json({
          error: 'Nie udało się przenieść zadania do nowego projektu',
          details: { taskId: id, payload: movePayload }
        }, { status: moveRes.status })
      }

      console.log('🚚 [Todoist Update] Project move success:', normalizedProjectId)

      if (!hasUpdateFields) {
        try {
          const latestRes = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })

          if (latestRes.ok) {
            const latestTask = await latestRes.json()
            return NextResponse.json({ success: true, task: latestTask })
          }
        } catch (fetchErr) {
          console.warn('⚠️ [Todoist Update] Failed to fetch task after move:', fetchErr)
        }

        return NextResponse.json({ 
          success: true, 
          task: { id, project_id: normalizedProjectId }
        })
      }
    }

    if (!hasUpdateFields) {
      return NextResponse.json({ success: true })
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
      
      let errorMessage = 'Nie udało się zaktualizować zadania'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          errorMessage = `Bad Todoist UPDATE: ${errorJson.error}`
        }
      } catch {
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
