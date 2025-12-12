// pages/api/todoist/add.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req:  NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const { content, description, due_date, priority, project_id } = req.body || {}
  const token = req.headers.authorization?. replace('Bearer ', '')
  
  if (!token) return res.status(401).json({ error: 'Token required' })
  if (!content) return res.status(400).json({ error: 'Content required' })

  try {
    const todoistRes = await fetch('https://api.todoist.com/rest/v2/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        description:  description || undefined,
        due_date: due_date || undefined,
        priority: priority || 4,
        project_id:  project_id || undefined
      })
    })

    if (!todoistRes.ok) {
      const errorText = await todoistRes.text()
      console.error('Todoist API error:', errorText)
      return res.status(todoistRes.status).json({ error: 'Todoist API error' })
    }

    const task = await todoistRes.json()
    return res.status(201).json({ task })
  } catch (err:  any) {
    console.error('Error adding task:', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
