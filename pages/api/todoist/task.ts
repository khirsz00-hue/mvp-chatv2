// pages/api/todoist/task.ts
// Returns details for a single task.
// Behavior:
//  - If token provided, try to GET task from Todoist REST API and return it.
//  - Merge with in-memory overrides (if any).
//  - If Todoist fetch fails and overrides exist, return overrides.
//  - If nothing found -> 404.
//
// Note: This is a lightweight adapter. For production you should
// validate tokens, add auth and persistent storage instead of in-memory.

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

async function fetchTodoistTask(id: string, token: string) {
  const url = `https://api.todoist.com/rest/v2/tasks/${encodeURIComponent(id)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Todoist responded ${res.status}`)
  const data = await res.json()
  // Map Todoist shape to our frontend expectation
  return {
    id: data.id,
    content: data.content,
    description: (data.description ?? '') as string,
    project_id: data.project_id,
    project_name: undefined,
    due: data.due ? (data.due.date || data.due) : undefined,
    added_at: data.added_at ?? data.created_at ?? null,
    priority: data.priority ?? undefined,
    // include raw for debugging
    _raw: data,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, token } = req.query as { id?: string; token?: string }
  if (!id) return res.status(400).json({ error: 'id required' })

  // If token present, prefer fetching from Todoist
  if (token) {
    try {
      const todo = await fetchTodoistTask(id, token)
      // merge overrides if present
      const ov = overrides.get(String(id))
      const merged = {
        ...todo,
        description: ov?.description ?? todo.description,
        project_id: ov?.project_id ?? todo.project_id,
        project_name: ov?.project_name ?? todo.project_name,
        due: ov?.due ?? todo.due,
        created_at: ov?.created_at ?? todo.added_at ?? null,
      }
      return res.status(200).json({ task: merged })
    } catch (err) {
      // Todoist fetch failed — fallback to overrides if present
      const ov = overrides.get(String(id))
      if (ov) return res.status(200).json({ task: ov })
      // otherwise return 404 to indicate no such task via our API
      return res.status(404).json({ error: 'Task not found (Todoist returned error and no local override)' })
    }
  }

  // No token: check overrides (local edits / temporary store)
  const ov = overrides.get(String(id))
  if (ov) return res.status(200).json({ task: ov })

  return res.status(404).json({ error: 'Not found' })
}
