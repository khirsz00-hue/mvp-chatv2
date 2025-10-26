// utils/chatStorage.ts
// Centralized helpers for chat storage keys and session management.

export type AssistantKey = 'Todoist Helper' | 'AI Planner' | '6 Hats'

export type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp: number }
export type SessionEntry = { id: string; title: string; timestamp: number; last?: string; meta?: any }

// Returns the canonical storage key for a given assistant and optional session id.
export function storageKeyFor(assistant: AssistantKey, sessionId?: string) {
  if (assistant === 'Todoist Helper') {
    if (sessionId) return `chat_task_${sessionId}`
    return 'chat_todoist'
  }
  if (assistant === 'AI Planner') {
    return sessionId ? `chat_planner_${sessionId}` : 'chat_planner'
  }
  return sessionId ? `chat_6hats_${sessionId}` : 'chat_6hats'
}

export function sessionsKeyFor(assistant: AssistantKey) {
  if (assistant === 'Todoist Helper') return 'chat_sessions_todoist'
  if (assistant === 'AI Planner') return 'chat_sessions_planner'
  return 'chat_sessions_6hats'
}

// localStorage helpers
export function loadConversation(key: string): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveConversation(key: string, conv: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(conv))
    window.dispatchEvent(new Event('chatUpdated'))
  } catch {}
}

export function loadSessions(key: string): SessionEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSessions(key: string, sessions: SessionEntry[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(sessions))
  } catch {}
}

export function upsertSession(key: string, session: SessionEntry) {
  const current = loadSessions(key)
  const idx = current.findIndex((s) => s.id === session.id)
  if (idx >= 0) current[idx] = { ...current[idx], ...session }
  else current.unshift(session)
  saveSessions(key, current.slice(0, 100))
}

export function scanSessionsFallback(assistant: AssistantKey): SessionEntry[] {
  if (typeof window === 'undefined') return []
  const out: SessionEntry[] = []
  try {
    const keys = Object.keys(localStorage)
    for (const k of keys) {
      if (assistant === 'Todoist Helper') {
        if (k.startsWith('chat_task_')) {
          const id = k.replace('chat_task_', '')
          const conv = loadConversation(k)
          const last = conv[conv.length - 1]?.content || ''
          out.push({ id, title: id, timestamp: Date.now(), last: last.slice(0, 300) })
        }
      } else if (assistant === 'AI Planner') {
        if (k.startsWith('chat_planner_') || k === 'chat_planner') {
          const id = k.replace('chat_planner_', '').replace('chat_planner', '')
          const conv = loadConversation(k)
          const last = conv[conv.length - 1]?.content || ''
          out.push({ id: id || k, title: id || k, timestamp: Date.now(), last: last.slice(0, 300) })
        }
      } else {
        if (k.startsWith('chat_6hats_') || k === 'chat_6hats') {
          const id = k.replace('chat_6hats_', '').replace('chat_6hats', '')
          const conv = loadConversation(k)
          const last = conv[conv.length - 1]?.content || ''
          out.push({ id: id || k, title: id || k, timestamp: Date.now(), last: last.slice(0, 300) })
        }
      }
    }
  } catch {}
  return out.slice(0, 100)
}
