import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { id, token } = await req.json()

    if (!id || !token) {
      return NextResponse.json({ error: 'Brak wymaganych parametrów' }, { status: 400 })
    }

    const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}/close`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('❌ Błąd Todoist COMPLETE:', errorText)
      return NextResponse.json({ error: 'Nie udało się ukończyć zadania' }, { status: 500 })
    }

    // 🔁 Event do odświeżenia frontendowej listy
    setTimeout(() => window?.dispatchEvent?.(new Event('taskUpdated')), 200)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('❌ COMPLETE error:', err)
    return NextResponse.json({ error: err.message || 'Błąd serwera' }, { status: 500 })
  }
}
