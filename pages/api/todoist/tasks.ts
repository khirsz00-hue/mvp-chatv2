import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Fetch tasks from Todoist API
    const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Todoist API error:', response.status, errorText)
      return res.status(response.status).json({
        error: 'Failed to fetch tasks from Todoist',
        details: errorText,
      })
    }

    const tasks = await response.json()

    return res.status(200).json({ tasks })
  } catch (error: any) {
    console.error('Error fetching Todoist tasks:', error)
    return res.status(500).json({
      error: 'Failed to fetch tasks',
      details: error.message,
    })
  }
}
