// pages/api/todoist/update.ts
// Accepts POST/PUT to update a task. For robustness in this environment we store
// updates in an in-memory overrides map so subsequent GET /api/todoist/task returns updated fields.
// If you want to actually propagate changes to Todoist, add a fetch request to the Todoist REST API
// using payload.token or Authorization header (see TODO comments).

import type { NextApiRequest, NextApiResponse } from 'next'

type Override = {
  id: string
  content?: string
  description?: string
  project_id?: string
  project_name?: string
  due?: string | null
  created_at?: string | number | null
}

const overrides = (global as any)._todoist_overrides ||= new Map<string, Override>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    res.setHeader('Allow', ['POST', 'PUT'])
    return res.status(405).end('Method Not Allowed')
  }

  const payload = req.body || {}
  const id = payload?.id
  if (!id) return res.status(400).json({ error: 'id required' })

  // If you want to proxy to Todoist, implement it here:
  // TODO: if (payload.token) -> call Todoist REST to update task fields.

  // Merge into overrides
  const existing = overrides.get(String(id)) || { id }
  const updated: Override = {
    ...existing,
    ...payload,
  }
  overrides.set(String(id), updated)

  return res.status(200).json({ ok: true, id: String(id), updated })
}
