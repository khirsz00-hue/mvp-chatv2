import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // Fetch labels from Todoist API
    const res = await fetch('https://api.todoist.com/rest/v2/labels', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('❌ Todoist labels error:', txt)
      return NextResponse.json({ error: 'Todoist error: ' + txt }, { status: 502 })
    }

    const labels = await res.json()
    console.log('✅ Fetched labels:', labels.length)
    
    return NextResponse.json({ labels })
  } catch (err) {
    console.error('❌ Labels route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
