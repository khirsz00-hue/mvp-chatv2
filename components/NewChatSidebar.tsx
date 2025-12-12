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
    <aside className={`relative flex flex-col transition-all duration-300 bg-gradient-to-b from-gray-50 to-white border-r border-gray-100 ${collapsed ? 'w-16' : 'w-80'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-soft">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">Historia</div>
              <div className="text-xs text-gray-500 truncate">{assistant}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button 
            onClick={loadList} 
            title="Odśwież" 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-600 hover:text-gray-900"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className={`px-3 py-3 border-b border-gray-100 bg-white/30 ${collapsed ? 'hidden' : ''}`}>
        <button 
          onClick={startNew} 
          className="w-full btn btn-primary text-sm shadow-glow group"
        >
          <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nowa rozmowa
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">Brak rozmów</p>
            <p className="text-xs text-gray-400">Rozpocznij nową rozmowę powyżej</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const isActive = activeSession?.id === s.id
              return (
                <li key={s.id} className="relative">
                  <button
                    onClick={() => openSession(s)}
                    className={`
                      w-full text-left p-3 rounded-xl transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-success-50 to-brand-50 border border-success-200 shadow-soft'
                        : 'bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 hover:shadow-soft'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isActive ? 'bg-success-500' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate mb-0.5 ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                          {s.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(s.timestamp).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {activeSession && <ChatModal assistant={assistant} sessionId={activeSession.id} sessionTitle={activeSession.title} isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
    </aside>
  )
}
