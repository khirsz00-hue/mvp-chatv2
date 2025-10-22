// Helper functions for consistent storage keys and sessions management
export type AssistantKey = 'Default' | 'GPT' | 'Todoist AI'

export function assistantToStorageKey(assistant: AssistantKey) {
  switch (assistant) {
    case 'GPT':
      return 'chat_gpt'
    case 'Todoist AI':
      return 'chat_todoist'
    default:
      return 'chat_global'
  }
}

// sessions list key for assistant
export function assistantSessionsKey(assistant: AssistantKey) {
  switch (assistant) {
    case 'GPT':
      return 'chat_sessions_gpt'
    case 'Todoist AI':
      return 'chat_sessions_todoist'
    default:
      return 'chat_sessions_global'
  }
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp: number }

// load conversation array from localStorage
export function loadConversation(storageKey: string): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveConversation(storageKey: string, conv: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey, JSON.stringify(conv))
  } catch {}
}

// sessions are simplified objects: { id: string, title: string, timestamp: number, last: string }
export type SessionEntry = { id: string; title: string; timestamp: number; last: string }

export function loadSessions(key: string): SessionEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
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
  const sessions = loadSessions(key)
  const idx = sessions.findIndex((s) => s.id === session.id)
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], ...session }
  } else {
    sessions.unshift(session)
  }
  saveSessions(key, sessions.slice(0, 50))
}
