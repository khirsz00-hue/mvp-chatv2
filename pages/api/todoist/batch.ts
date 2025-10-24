// Simple API route for subtasks. If Todoist backend is available, you can extend this handler
// to proxy calls to Todoist REST using the provided token.
// For now this implements an in-memory/local fallback persisted in-memory (ephemeral) and returns 404 only when method not allowed.

import type { NextApiRequest, NextApiResponse } from 'next'

type Subtask = { id: string; parentId: string; content: string; createdAt: number; completed?: boolean }
const store = new Map<string, Subtask[]>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const parentId = String(req.query.parentId || '')
    if (!parentId) return res.status(400).json({ error: 'parentId required' })

    // Try to proxy to real backend if needed - TODO: implement proxy to real Todoist if desired
    // Fallback to local store
    const arr = store.get(parentId) || []
    return res.status(200).json({ subtasks: arr })
  }

  if (req.method === 'POST') {
    const { parentId, content } = req.body || {}
    if (!parentId || !content) return res.status(400).json({ error: 'parentId and content required' })

    // Try to proxy to real backend if desired (not implemented)
    // Fallback: store locally in memory
    const arr = store.get(parentId) || []
    const id = `st_${Date.now()}_${Math.floor(Math.random()*10000)}`
    const s: Subtask = { id, parentId, content, createdAt: Date.now(), completed: false }
    arr.push(s)
    store.set(parentId, arr)
    return res.status(201).json({ subtask: s })
  }

  if (req.method === 'PATCH') {
    const { parentId, subtaskId, patch } = req.body || {}
    if (!parentId || !subtaskId || !patch) return res.status(400).json({ error: 'parentId, subtaskId and patch required' })
    const arr = store.get(parentId) || []
    const idx = arr.findIndex((s) => s.id === subtaskId)
    if (idx === -1) return res.status(404).json({ error: 'subtask not found' })
    arr[idx] = { ...arr[idx], ...patch }
    store.set(parentId, arr)
    return res.status(200).json({ subtask: arr[idx] })
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH'])
  res.status(405).end('Method Not Allowed')
}
