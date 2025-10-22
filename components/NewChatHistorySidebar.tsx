'use client'

import React, { useEffect, useState } from 'react'
import AssistantSelector from './AssistantSelector'
import ChatModal from './ChatModal'
import { AssistantKey, loadSessions, sessionsKeyFor, scanSessionsFallback, SessionEntry, storageKeyFor, upsertSession } from '../utils/chatStorage'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

export default function NewChatSidebar() {
  const [assistant, setAssistant] = useState<AssistantKey>('Todoist Helper')
  const [collapsed, setCollapsed] = useState(false)
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [activeSession, setActiveSession] = useState<SessionEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // load sessions for selected assistant, fallback to scanning localStorage if none
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
    // listen for taskSelect events from task list UI (Todoist tasks)
    const handleTaskSelect = (e: any) => {
      try {
        const detail = e.detail
        if (!detail) return
        // Expecting detail: { mode: 'todoist', task: { id, title, description } }
        if (detail.mode === 'todoist' && detail.task) {
          const t = detail.task
          const entry: SessionEntry = { id: t.id, title: t.title || t.id, timestamp: Date.now(), last: '' }
          upsertSession(sessionsKeyFor('Todoist Helper'), entry)
          setTimeout(() => loadList(), 100)
          // open modal for Todoist Helper automatically
          setActiveSession(entry)
          setModalOpen(true)
          setAssistant('Todoist Helper')
        }
      } catch {}
    }
    window.addEventListener('taskSelect', handleTaskSelect)
    return () => {
      window.removeEventListener('storage', onUpdate)
      window.removeEventListener('chatUpdated', onUpdate)
      window.removeEventListener('taskSelect', handleTaskSelect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant])

  const startNew = () => {
    const id = `${assistant.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
    const entry: SessionEntry = { id, title: `Nowa rozmowa ${new Date().toLocaleString()}`, timestamp: Date.now(), last: '' }
    // create intro
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

  return (
    <aside className={`flex flex-col transition-all bg-gray-50 border-r border-gray-200 ${collapsed ? 'w-16' : 'w-80'}`}>
      {/* assistant selector full width */}
      <div className={`${collapsed ? 'hidden' : ''}`}>
        <AssistantSelector value={assistant} onChange={(v) => setAssistant(v as AssistantKey)} />
      </div>

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
              <li key={s.id}>
                <button onClick={() => openSession(s)} className={`w-full text-left p-2 rounded-lg flex flex-col gap-1 hover:bg-gray-100 transition ${activeSession?.id === s.id ? 'bg-green-50 border border-green-200' : 'bg-white border border-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 truncate">{s.title}</span>
                    <span className="text-xs text-gray-400">{new Date(s.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2 italic">{s.last || '— brak podglądu —'}</div>
                </button>
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
