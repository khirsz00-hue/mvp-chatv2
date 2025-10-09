import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { id, token, newDate } = await req.json()
  const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ due_date: newDate }),
  })
  return NextResponse.json({ ok: res.ok })
}
