import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: Request) {
  const { assistantId, messages } = await req.json()

  // Załaduj prompt z pliku
  const promptPath = path.join(process.cwd(), 'src', 'assistants', assistantId, 'prompt.txt')
  const prompt = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf8') : ''

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      ...messages
    ],
    temperature: 0.7
  })

  const answer = response.choices[0].message?.content || ''
  return NextResponse.json({ answer })
}
