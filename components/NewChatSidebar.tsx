'use client'

import React, { useEffect, useState } from 'react'
import ChatModal from './ChatModal'
import type { AssistantKey, SessionEntry } from '../utils/chatStorage'
import { loadSessions, sessionsKeyFor, scanSessionsFallback, storageKeyFor, upsertSession, loadConversation, saveConversation } from '../utils/chatStorage'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

export default function NewChatSidebar({
  assistant,
  onAssistantChange,
}: {
  assistant: AssistantKey
  onAssistantChange?: (a: AssistantKey) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [activeSession, setActiveSession] = useState<SessionEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadList = () => {
    const key = sessionsKeyFor(assistant)
    const list = loadSessions(key)
    if (list && list.length) setSessions(list)
    else {
      const fallback = scanSessionsFallback(assistant)
      setSessions(fallback)
    }
  }

  useEffect(() => {
    loadList()
    const onUpdate = () => loadList()
    window.addEventListener('storage', onUpdate)
    window.addEventListener('chatUpdated', onUpdate)

    const markAiSent = (sessionId: string) => {
      try {
        sessionStorage.setItem(`ai_sent__${assistant}__${sessionId}`, '1')
      } catch {}
    }
    const isAiSent = (sessionId: string) => {
      try {
        return !!sessionStorage.getItem(`ai_sent__${assistant}__${sessionId}`)
      } catch {
        return false
      }
    }

    const handleTaskHelp = async (e: any) => {
      try {
        const detail = e.detail
        if (!detail || !detail.task) return
        const t = detail.task
        const entry: SessionEntry = { id: t.id, title: t.title || t.id, timestamp: Date.now(), last: '' }
        const sk = storageKeyFor('Todoist Helper' as AssistantKey, t.id)
        upsertSession(sessionsKeyFor('Todoist Helper' as AssistantKey), entry)
        setTimeout(() => loadList(), 100)

        // Load existing conversation
        const conv = loadConversation(sk) || []
        const userPrompt = `Pomóż mi z zadaniem: "${t.title}".\n\nOpis: ${t.description || ''}`.trim()

        // Check if we've already sent the same last user message (avoid duplicates)
        let needToSend = true
        if (conv && conv.length) {
          const lastUser = [...conv].reverse().find((m) => m.role === 'user')
          if (lastUser && lastUser.content === userPrompt) needToSend = false
        }

        // Also check sessionStorage guard so other listeners (aiInitial etc.) won't duplicate
        if (isAiSent(t.id)) needToSend = false

        if (needToSend) {
          // Add user message locally first
          const userMsg = { role: 'user' as const, content: userPrompt, timestamp: Date.now() }
          const newConv = conv.concat(userMsg)
          saveConversation(sk, newConv)

          // Mark as sent (to prevent other components from duplicating)
          markAiSent(t.id)

          // send to backend
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: userPrompt, assistant: 'Todoist Helper', sessionId: t.id, task: t }),
            })
            const data = await res.json().catch(() => ({}))
            const reply = data?.reply || data?.content || 'Brak odpowiedzi od AI.'
            const aiMsg = { role: 'assistant' as const, content: reply, timestamp: Date.now() }
            const finalConv = newConv.concat(aiMsg)
            saveConversation(sk, finalConv)
          } catch (err) {
            console.error('taskHelp api error', err)
            // keep user message in conversation even if AI fails; user can retry in modal
          }
        }

        setActiveSession(entry)
        setModalOpen(true)
        if (onAssistantChange) onAssistantChange('Todoist Helper' as AssistantKey)
      } catch (err) {
        console.error('handleTaskHelp error', err)
      }
    }

    window.addEventListener('taskHelp', handleTaskHelp)

    return () => {
      window.removeEventListener('storage', onUpdate)
      window.removeEventListener('chatUpdated', onUpdate)
      window.removeEventListener('taskHelp', handleTaskHelp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant])

  const startNew = () => {
    const id = `${assistant.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
    const entry: SessionEntry = { id, title: `Nowa rozmowa ${new Date().toLocaleString()}`, timestamp: Date.now(), last: '' }
    const sk = storageKeyFor(assistant, id)
    const intro: any[] = [{ role: 'assistant', content: `Nowa rozmowa z ${assistant}`, timestamp: Date.now() }]
    try {
      localStorage.setItem(sk, JSON.stringify(intro))
      upsertSession(sessionsKeyFor(assistant), entry)
      loadList()
      setActiveSession(entry)
      setModalOpen(true)
    } catch (err) {
      console.error(err)
    }
  }

  const openSession = (s: SessionEntry) => {
    setActiveSession(s)
    setModalOpen(true)
  }

  const deleteSession = (s: SessionEntry) => {
    if (!confirm(`Usunąć rozmowę "${s.title}"?`)) return
    try {
      const sk = storageKeyFor(assistant, s.id)
      localStorage.removeItem(sk)
      const key = sessionsKeyFor(assistant)
      const arr = loadSessions(key).filter((x) => x.id !== s.id)
      localStorage.setItem(key, JSON.stringify(arr))
      setSessions(arr)
      if (activeSession?.id === s.id) {
        setActiveSession(null)
        setModalOpen(false)
      }
      window.dispatchEvent(new Event('chatUpdated'))
    } catch (err) {
      console.error(err)
    }
  }

  // Ensure toggle button is always reachable even when collapsed: render an absolute toggle
  return (
    <aside className={`relative flex flex-col transition-all bg-gray-50 border-r border-gray-200 ${collapsed ? 'w-16' : 'w-80'}`}>
      {/* persistent toggle button (always visible) */}
      <button
        onClick={() => setCollapsed((s) => !s)}
        title={collapsed ? 'Rozwiń' : 'Zwiń'}
        className="absolute -right-4 top-4 w-8 h-8 bg-violet-600 text-white rounded-full shadow z-50 flex items-center justify-center"
        aria-label={collapsed ? 'Otwórz' : 'Zwiń'}
        style={{ transform: 'translateX(50%)' }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        <div className="text-sm font-semibold text-gray-700">{collapsed ? 'Hist' : `Historia — ${assistant}`}</div>
        <div className="flex items-center gap-2">
          <button onClick={loadList} title="Odśwież" className="p-1 rounded hover:bg-gray-100"><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className={`px-3 py-2 border-b bg-white ${collapsed ? 'hidden' : ''}`}>
        <button onClick={startNew} className="w-full text-sm bg-violet-600 text-white px-3 py-2 rounded-md shadow-sm hover:opacity-95">+ Nowa rozmowa</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="text-sm text-gray-500 p-3 italic">Brak rozmów dla tego asystenta.</div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="relative">
                <div className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 hover:bg-gray-100 transition ${activeSession?.id === s.id ? 'bg-green-50 border border-green-200' : 'bg-white border border-transparent'}`}>
                  <button onClick={() => openSession(s)} className="text-left flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{s.title}</div>
                    <div className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleDateString()}</div>
                  </button>
                  <button onClick={() => deleteSession(s)} title="Usuń rozmowę" className="text-sm text-red-500 ml-2 px-2 py-1 rounded hover:bg-red-50">Usuń</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeSession && (
        <ChatModal assistant={assistant} sessionId={activeSession.id} sessionTitle={activeSession.title} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      )}
    </aside>
  )
}
