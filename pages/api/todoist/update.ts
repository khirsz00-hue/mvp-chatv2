// Lightweight update endpoint that accepts POST and PUT.
// By default it returns success (so frontend doesn't get 405).
// Replace TODO with actual Todoist API call if you want to push updates to Todoist.

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    res.setHeader('Allow', ['POST', 'PUT'])
    return res.status(405).end('Method Not Allowed')
  }

  const payload = req.body || {}
  const id = payload?.id
  if (!id) return res.status(400).json({ error: 'id required' })

  try {
    // TODO: If you want server to update Todoist, do it here:
    // fetch('https://api.todoist.com/rest/v2/tasks/{id}', {...}) using token from payload.token or Authorization header.

    // For now respond with success so front-end can continue and re-fetch task if needed.
    return res.status(200).json({ ok: true, id })
  } catch (err) {
    console.error('update api error', err)
    return res.status(500).json({ error: String(err) })
  }
}
