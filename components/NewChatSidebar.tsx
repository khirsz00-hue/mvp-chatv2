'use client'

import React, { useEffect, useState } from 'react'
import ChatModal from './ChatModal'
import type { AssistantKey, SessionEntry } from '../utils/chatStorage'
import { loadSessions, sessionsKeyFor, scanSessionsFallback, storageKeyFor, upsertSession, saveSessions } from '../utils/chatStorage'
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

    // Listen for taskSelect (open task detail) OR taskHelp (open chat)
    const handleTaskSelect = (e: any) => {
      try {
        const detail = e.detail
        if (!detail) return
        // if taskSelect is used to open TaskDialog, we still upsert session so history is available
        if (detail.mode === 'todoist' && detail.task) {
          const t = detail.task
          const entry: SessionEntry = { id: t.id, title: t.title || t.id, timestamp: Date.now(), last: '' }
          upsertSession(sessionsKeyFor('Todoist Helper'), entry)
          setTimeout(() => loadList(), 100)
          // if detail.openChat (explicit), open chat modal
          if (detail.openChat) {
            setActiveSession(entry)
            setModalOpen(true)
            if (onAssistantChange) onAssistantChange('Todoist Helper')
          }
        }
      } catch {}
    }

    const handleTaskHelp = (e: any) => {
      try {
        const detail = e.detail
        if (!detail || !detail.task) return
        const t = detail.task
        const entry: SessionEntry = { id: t.id, title: t.title || t.id, timestamp: Date.now(), last: '' }
        upsertSession(sessionsKeyFor('Todoist Helper'), entry)
        setTimeout(() => loadList(), 100)
        setActiveSession(entry)
        setModalOpen(true)
        if (onAssistantChange) onAssistantChange('Todoist Helper')
      } catch {}
    }

    window.addEventListener('taskSelect', handleTaskSelect)
    window.addEventListener('taskHelp', handleTaskHelp)

    return () => {
      window.removeEventListener('storage', onUpdate)
      window.removeEventListener('chatUpdated', onUpdate)
      window.removeEventListener('taskSelect', handleTaskSelect)
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
      // remove conversation key
      const sk = storageKeyFor(assistant, s.id)
      localStorage.removeItem(sk)
      // remove from sessions index
      const key = sessionsKeyFor(assistant)
      const arr = loadSessions(key).filter((x) => x.id !== s.id)
      saveSessions(key, arr)
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

  return (
    <aside className={`flex flex-col transition-all bg-gray-50 border-r border-gray-200 ${collapsed ? 'w-16' : 'w-80'}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        <div className="text-sm font-semibold text-gray-700">{collapsed ? 'Hist' : `Historia — ${assistant}`}</div>
        <div className="flex items-center gap-2">
          <button onClick={loadList} title="Odśwież" className="p-1 rounded hover:bg-gray-100"><RefreshCw size={16} /></button>
          <button onClick={() => setCollapsed((s) => !s)} title={collapsed ? 'Rozwiń' : 'Zwiń'} className="p-1 rounded hover:bg-gray-100">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
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
                <div className={`w-full text-left p-2 rounded-lg flex flex-col gap-1 hover:bg-gray-100 transition ${activeSession?.id === s.id ? 'bg-green-50 border border-green-200' : 'bg-white border border-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <button onClick={() => openSession(s)} className="text-left flex-1">
                      <div className="font-medium text-gray-800 truncate">{s.title}</div>
                      <div className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleDateString()}</div>
                    </button>
                    <button onClick={() => deleteSession(s)} title="Usuń rozmowę" className="text-sm text-red-500 ml-2 px-2 py-1 rounded hover:bg-red-50">Usuń</button>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2 italic">{s.last || '— brak podglądu —'}</div>
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
