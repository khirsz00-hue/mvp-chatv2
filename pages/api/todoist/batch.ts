// pages/api/todoist/batch.ts
// Accepts POST { action, ids, payload } and applies changes in-memory
// (postpone/delete/complete). Returns per-id results.
// If you want server-side Todoist operations, proxy calls to Todoist using payload.token.

import type { NextApiRequest, NextApiResponse } from 'next'

const overrides = (global as any)._todoist_overrides ||= new Map<string, any>()
const deleted = (global as any)._todoist_deleted ||= new Set<string>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const { action, ids, payload } = req.body || {}
  if (!action || !Array.isArray(ids)) return res.status(400).json({ error: 'action and ids required' })

  const results: any[] = []

  for (const id of ids) {
    try {
      if (action === 'delete') {
        // mark deleted locally
        deleted.add(String(id))
        results.push({ id, ok: true, action: 'deleted' })
      } else if (action === 'complete') {
        // mark as completed locally by setting a flag in overrides
        const ex = overrides.get(String(id)) || { id }
        ex.completed = true
        overrides.set(String(id), ex)
        results.push({ id, ok: true, action: 'completed' })
      } else if (action === 'postpone') {
        const newDate = payload?.newDate
        if (!newDate) { results.push({ id, ok: false, error: 'newDate required' }); continue }
        const ex = overrides.get(String(id)) || { id }
        ex.due = newDate
        overrides.set(String(id), ex)
        results.push({ id, ok: true, action: 'postponed', newDate })
      } else {
        results.push({ id, ok: false, error: 'unknown action' })
      }
    } catch (err) {
      results.push({ id, ok: false, error: String(err) })
    }
  }

  return res.status(200).json({ results, message: `Batch executed: ${action} on ${ids.length} items` })
}
