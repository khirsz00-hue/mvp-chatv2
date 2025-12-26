import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, task_id, content } = body
    
    if (!token || !task_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: token, task_id, content' }, 
        { status: 400 }
      )
    }

    // Add comment to task via Todoist API
    const res = await fetch('https://api.todoist.com/rest/v2/comments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_id,
        content,
      }),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('❌ Todoist comment error:', txt)
      return NextResponse.json({ error: 'Todoist error: ' + txt }, { status: 502 })
    }

    const comment = await res.json()
    console.log('✅ Comment added to task:', task_id)
    
    return NextResponse.json({ success: true, comment })
  } catch (err) {
    console.error('❌ Comments route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
