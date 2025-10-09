import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { id, token } = await req.json()
  const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return NextResponse.json({ ok: res.ok })
}
