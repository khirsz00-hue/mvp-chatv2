import { NextResponse } from 'next/server'

interface TodoistUpdatePayload {
  content?: string
  description?: string
  priority?: number
  labels?: string[]
  due_date?: string | null  // ✅ Todoist API v2: use due_date for YYYY-MM-DD format
  due_string?: string       // ✅ Use only for natural language ("today", "tomorrow", etc.)
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
        updatePayload.due_date = null  // ✅ Clear due date
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

    // Handle due_string from updates (convert date formats to due_date)
    if (updates.due_string !== undefined) {
      if (updates.due_string === null) {
        updatePayload.due_date = null  // ✅ Clear due date
      } else if (typeof updates.due_string === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(updates.due_string)) {
          // Convert date format to due_date
          updatePayload.due_date = updates.due_string
        } else {
          // Keep natural language strings ("today", "tomorrow", etc.)
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
      // Validate that the task exists before attempting move
      const taskCheckRes = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!taskCheckRes.ok) {
        console.error('❌ [Todoist Update] Task not found:', id)
        return NextResponse.json({
          error: 'Zadanie nie istnieje w Todoist (może zostało usunięte)',
          details: { taskId: id }
        }, { status: 404 })
      }
      
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
        
        let errorJson: any = null
        try {
          errorJson = JSON.parse(errorText)
        } catch {}
        
        // Handle 404 - task or project not found
        if (moveRes.status === 404) {
          return NextResponse.json({
            error: 'Zadanie lub projekt nie istnieje w Todoist',
            details: { 
              taskId: id, 
              payload: movePayload,
              todoistError: errorJson || errorText
            }
          }, { status: 404 })
        }
        
        return NextResponse.json({
          error: 'Nie udało się przenieść zadania do nowego projektu',
          details: { 
            taskId: id, 
            payload: movePayload,
            todoistError: errorJson || errorText
          }
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
      let errorJson: any = null
      
      try {
        errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          errorMessage = `Todoist API: ${errorJson.error}`
        }
      } catch {
        if (errorText) {
          errorMessage = `Todoist API: ${errorText}`
        }
      }
      
      // Handle 404 - task not found
      if (res.status === 404) {
        return NextResponse.json({ 
          error: 'Zadanie nie istnieje w Todoist (może zostało usunięte)',
          details: { 
            taskId: id, 
            payload: updatePayload,
            todoistError: errorJson || errorText
          }
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: { 
          taskId: id, 
          payload: updatePayload,
          todoistError: errorJson || errorText
        }
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
