import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { id, token, newDate } = await req.json()

    if (!id || !token || !newDate) {
      return NextResponse.json({ error: 'Brak wymaganych parametrów' }, { status: 400 })
    }

    // 🗓️ Aktualizacja daty zadania w Todoist
    const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ due_date: newDate }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('❌ Błąd API Todoist:', errorText)
      return NextResponse.json({ error: 'Błąd podczas aktualizacji zadania' }, { status: 500 })
    }

    // 🔁 Odśwież frontend po zmianie
    setTimeout(() => window?.dispatchEvent?.(new Event('taskUpdated')), 200)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('❌ POSTPONE error:', err)
    return NextResponse.json({ error: err.message || 'Błąd serwera' }, { status: 500 })
  }
}
