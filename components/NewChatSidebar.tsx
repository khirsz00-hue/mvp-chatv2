'use client'

import React, { useEffect, useState } from 'react'
import ChatModal from './ChatModal'
import type { AssistantKey, SessionEntry } from '../utils/chatStorage'
import { loadSessions, sessionsKeyFor, scanSessionsFallback, storageKeyFor, upsertSession, loadConversation, saveConversation } from '../utils/chatStorage'
import { RefreshCw } from 'lucide-react'

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
    else setSessions(scanSessionsFallback(assistant))
  }

  useEffect(() => {
    loadList()
    const onUpdate = () => loadList()
    window.addEventListener('storage', onUpdate)
    window.addEventListener('chatUpdated', onUpdate)

    const markSent = (id: string) => { try { sessionStorage.setItem(`ai_sent__${assistant}__${id}`, '1') } catch {} }
    const isSent = (id: string) => { try { return !!sessionStorage.getItem(`ai_sent__${assistant}__${id}`) } catch { return false } }

    const handleTaskHelp = async (e: any) => {
      const t = e?.detail?.task
      if (!t) return
      const entry: SessionEntry = { id: t.id, title: t.title || t.id, timestamp: Date.now(), last: '' }
      upsertSession(sessionsKeyFor('Todoist Helper' as AssistantKey), entry)
      setTimeout(() => loadList(), 100)

      // open modal immediately
      setActiveSession(entry)
      setModalOpen(true)
      if (onAssistantChange) onAssistantChange('Todoist Helper' as AssistantKey)

      const sk = storageKeyFor('Todoist Helper' as AssistantKey, t.id)
      const userPrompt = `Pomóż mi z zadaniem: "${t.title}".\n\nOpis: ${t.description || ''}`.trim()
      const conv = loadConversation(sk) || []
      let need = true
      if (conv && conv.length) {
        const lastUser = [...conv].reverse().find((m) => m.role === 'user')
        if (lastUser && lastUser.content === userPrompt) need = false
      }
      if (isSent(t.id)) need = false

      if (need) {
        const userMsg = { role: 'user' as const, content: userPrompt, timestamp: Date.now() }
        saveConversation(sk, conv.concat(userMsg))
        markSent(t.id)
        window.dispatchEvent(new CustomEvent('aiInitial', { detail: { id: t.id, title: t.title, description: t.description } }))
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Odpowiedź w toku...' } }))

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userPrompt, assistant: 'Todoist Helper', sessionId: t.id, task: t }),
          })
          const data = await res.json().catch(() => ({}))
          const reply = data?.reply || data?.content || 'Brak odpowiedzi od AI.'
          const aiMsg = { role: 'assistant' as const, content: reply, timestamp: Date.now() }
          saveConversation(sk, conv.concat(userMsg, aiMsg))
          window.dispatchEvent(new CustomEvent('aiReplySaved', { detail: { sessionId: t.id, reply } }))
          window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Odpowiedź otrzymana' } }))
        } catch (err) {
          console.error(err)
          window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Błąd AI' } }))
        }
      } else {
        window.dispatchEvent(new CustomEvent('aiReplySaved', { detail: { sessionId: t.id, reply: null } }))
      }
    }

    window.addEventListener('taskHelp', handleTaskHelp)
    return () => {
      window.removeEventListener('storage', onUpdate)
      window.removeEventListener('chatUpdated', onUpdate)
      window.removeEventListener('taskHelp', handleTaskHelp)
    }
  }, [assistant])

  const startNew = () => {
    const id = `${assistant.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
    const entry: SessionEntry = { id, title: `Nowa rozmowa ${new Date().toLocaleString()}`, timestamp: Date.now(), last: '' }
    const sk = storageKeyFor(assistant, id)
    localStorage.setItem(sk, JSON.stringify([{ role: 'assistant', content: `Nowa rozmowa z ${assistant}`, timestamp: Date.now() }]))
    upsertSession(sessionsKeyFor(assistant), entry)
    loadList()
    setActiveSession(entry)
    setModalOpen(true)
  }

  const openSession = (s: SessionEntry) => { setActiveSession(s); setModalOpen(true) }

  return (
    <aside className={`relative flex flex-col transition-all bg-gray-50 border-r border-gray-200 ${collapsed ? 'w-16' : 'w-80'}`}>
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
        {sessions.length === 0 ? <div className="text-sm text-gray-500 p-3 italic">Brak rozmów dla tego asystenta.</div> : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="relative">
                <div className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 hover:bg-gray-100 transition ${activeSession?.id === s.id ? 'bg-green-50 border border-green-200' : 'bg-white border border-transparent'}`}>
                  <button onClick={() => openSession(s)} className="text-left flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{s.title}</div>
                    <div className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleDateString()}</div>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeSession && <ChatModal assistant={assistant} sessionId={activeSession.id} sessionTitle={activeSession.title} isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
    </aside>
  )
}
