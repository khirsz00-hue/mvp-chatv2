import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch tasks from Todoist')
    }

    const tasks = await response.json()
    res.status(200).json(tasks)
  } catch (error) {
    console.error('Error fetching Todoist tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
}
