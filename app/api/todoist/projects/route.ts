import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Brak tokenu Todoist' }, { status: 401 })
  }

  try {
    console.log('🔍 Fetching projects from Todoist API')
    
    const res = await fetch('https://api.todoist.com/rest/v2/projects', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('❌ Błąd Todoist API:', err, 'Status:', res.status)
      return NextResponse.json({ error: `Błąd Todoist API: ${err}` }, { status: res.status })
    }

    const projects = await res.json()
    console.log(`✅ Pobrano ${projects.length} projektów z Todoist`)

    const simplified = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
    }))

    return NextResponse.json({ projects: simplified })
  } catch (error: any) {
    console.error('❌ Błąd /api/todoist/projects:', error?.message || error)
    return NextResponse.json({ error: 'Nie udało się pobrać projektów' }, { status: 500 })
  }
}
