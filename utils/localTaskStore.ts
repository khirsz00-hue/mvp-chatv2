// utils/localTaskStore.ts
// Client-side store for per-task metadata using localStorage.

export type MoveEntry = { from?: string | null; to?: string | null; when: number }
export type LocalSubtask = { id: string; parentId: string; content: string; createdAt: number; completed?: boolean }

const EST_PREFIX = 'task_estimate:'
const HIST_PREFIX = 'task_history:'
const ST_PREFIX = 'task_subtasks:'

// ✅ Helper: safely access localStorage only in browser
function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

// Estimates
export function getEstimate(taskId: string): { minutes: number; updatedAt: number } | null {
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    const raw = ls.getItem(EST_PREFIX + taskId)
    if (!raw) return null
    return JSON.parse(raw) as { minutes: number; updatedAt: number }
  } catch {
    return null
  }
}

export function setEstimate(taskId: string, minutes: number) {
  const ls = safeLocalStorage()
  if (!ls) return null
  const entry = { minutes: Number(minutes || 0), updatedAt: Date.now() }
  try {
    ls.setItem(EST_PREFIX + taskId, JSON.stringify(entry))
  } catch (e) {
    console.error('setEstimate error', e)
  }
  return entry
}

// History (move events)
export function getHistory(taskId: string): MoveEntry[] {
  const ls = safeLocalStorage()
  if (!ls) return []
  try {
    const raw = ls.getItem(HIST_PREFIX + taskId)
    if (!raw) return []
    return JSON.parse(raw) as MoveEntry[]
  } catch {
    return []
  }
}

export function appendHistory(taskId: string, from: string | null, to: string | null) {
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    const arr = getHistory(taskId)
    const entry: MoveEntry = { from: from ?? null, to: to ?? null, when: Date.now() }
    arr.push(entry)
    ls.setItem(HIST_PREFIX + taskId, JSON.stringify(arr))
    return entry
  } catch (e) {
    console.error('appendHistory error', e)
    return null
  }
}

export function clearHistory(taskId: string) {
  const ls = safeLocalStorage()
  if (!ls) return
  try {
    ls.removeItem(HIST_PREFIX + taskId)
  } catch {}
}

// Subtasks local fallback
export function listSubtasksLocal(parentId: string): LocalSubtask[] {
  const ls = safeLocalStorage()
  if (!ls) return []
  try {
    const raw = ls.getItem(ST_PREFIX + parentId)
    if (!raw) return []
    return JSON.parse(raw) as LocalSubtask[]
  } catch {
    return []
  }
}

export function addSubtaskLocal(parentId: string, content: string) {
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    const arr = listSubtasksLocal(parentId)
    const id = `local_st_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    const s: LocalSubtask = { id, parentId, content, createdAt: Date.now(), completed: false }
    arr.push(s)
    ls.setItem(ST_PREFIX + parentId, JSON.stringify(arr))
    return s
  } catch (e) {
    console.error('addSubtaskLocal error', e)
    return null
  }
}

export function updateSubtaskLocal(parentId: string, subtaskId: string, patch: Partial<LocalSubtask>) {
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    const arr = listSubtasksLocal(parentId)
    const idx = arr.findIndex((s) => s.id === subtaskId)
    if (idx === -1) return null
    arr[idx] = { ...arr[idx], ...patch }
    ls.setItem(ST_PREFIX + parentId, JSON.stringify(arr))
    return arr[idx]
  } catch (e) {
    console.error('updateSubtaskLocal error', e)
    return null
  }
}
