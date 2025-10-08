import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const assistant = searchParams.get('assistant')
  if (!assistant) return NextResponse.json({ error: 'Brak parametru assistant' }, { status: 400 })

  const filePath = path.join(process.cwd(), 'src', 'assistants', assistant, 'prompt.txt')
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Nie znaleziono pliku prompt.txt' }, { status: 404 })

  const content = fs.readFileSync(filePath, 'utf8')
  return NextResponse.json({ content })
}

export async function POST(req: Request) {
  const { assistant, content } = await req.json()
  if (!assistant || !content) return NextResponse.json({ error: 'Brak danych' }, { status: 400 })

  const filePath = path.join(process.cwd(), 'src', 'assistants', assistant, 'prompt.txt')
  fs.writeFileSync(filePath, content)
  return NextResponse.json({ success: true })
}
