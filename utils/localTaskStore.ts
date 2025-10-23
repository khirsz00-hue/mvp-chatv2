// Simple client-side store for per-task metadata (estimates, move history).
// Uses localStorage under keys:
//  - "task_estimate:<taskId>" -> { value, updatedAt }
//  - "task_history:<taskId>" -> [{ from, to, when }]
//
// Non-persistent across other clients (local only) — fits your current request.

export type MoveEntry = { from?: string | null; to?: string | null; when: number }

const EST_PREFIX = 'task_estimate:'
const HIST_PREFIX = 'task_history:'

export function getEstimate(taskId: string): { value: string; updatedAt: number } | null {
  try {
    const raw = localStorage.getItem(EST_PREFIX + taskId)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setEstimate(taskId: string, value: string) {
  const entry = { value: String(value || ''), updatedAt: Date.now() }
  try {
    localStorage.setItem(EST_PREFIX + taskId, JSON.stringify(entry))
  } catch (e) {
    console.error('setEstimate error', e)
  }
  return entry
}

export function getHistory(taskId: string): MoveEntry[] {
  try {
    const raw = localStorage.getItem(HIST_PREFIX + taskId)
    if (!raw) return []
    return JSON.parse(raw) as MoveEntry[]
  } catch {
    return []
  }
}

export function appendHistory(taskId: string, from: string | null, to: string | null) {
  try {
    const arr = getHistory(taskId)
    const entry: MoveEntry = { from: from ?? null, to: to ?? null, when: Date.now() }
    arr.push(entry)
    localStorage.setItem(HIST_PREFIX + taskId, JSON.stringify(arr))
    return entry
  } catch (e) {
    console.error('appendHistory error', e)
    return null
  }
}

export function clearHistory(taskId: string) {
  try {
    localStorage.removeItem(HIST_PREFIX + taskId)
  } catch {}
}
