import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const assistant = searchParams.get('assistant')
  const file = searchParams.get('file')

  if (!assistant) return NextResponse.json({ error: 'Brak parametru assistant' }, { status: 400 })
  const basePath = path.join(process.cwd(), 'src', 'assistants', assistant, 'knowledge')

  if (file) {
    const filePath = path.join(basePath, file)
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Nie znaleziono pliku' }, { status: 404 })
    const content = fs.readFileSync(filePath, 'utf8')
    return NextResponse.json({ content })
  }

  const files = fs.readdirSync(basePath)
  return NextResponse.json({ files })
}

export async function POST(req: Request) {
  const { assistant, file, content } = await req.json()
  if (!assistant || !file) return NextResponse.json({ error: 'Brak danych' }, { status: 400 })

  const filePath = path.join(process.cwd(), 'src', 'assistants', assistant, 'knowledge', file)
  fs.writeFileSync(filePath, content || '')
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const { assistant, file } = await req.json()
  if (!assistant || !file) return NextResponse.json({ error: 'Brak danych' }, { status: 400 })

  const filePath = path.join(process.cwd(), 'src', 'assistants', assistant, 'knowledge', file)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  return NextResponse.json({ success: true })
}
