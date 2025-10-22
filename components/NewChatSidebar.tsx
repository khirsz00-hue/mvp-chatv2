'use client'

import React, { useEffect, useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import AssistantSelector from './AssistantSelector'
import ChatModal from './ChatModal'
import { assistantToStorageKey, assistantSessionsKey, loadSessions, SessionEntry } from '../utils/chatStorage'

export default function NewChatSidebar() {
  const [assistant, setAssistant] = useState<'Default' | 'GPT' | 'Todoist AI'>('Default')
  const [collapsed, setCollapsed] = useState(false)
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [activeSession, setActiveSession] = useState<SessionEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadList = () => {
    const sk = assistantSessionsKey(assistant)
    const list = loadSessionsOrFallback(sk, assistant)
    setSessions(list)
  }

  useEffect(() => {
    loadList()
    const onUpdated = () => loadList()
    window.addEventListener('storage', onUpdated)
    window.addEventListener('chatUpdated', onUpdated)
    return () => {
      window.removeEventListener('storage', onUpdated)
      window.removeEventListener('chatUpdated', onUpdated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant])

  function loadSessionsOrFallback(key: string, asst: typeof assistant) {
    try {
      const s = loadSessions(key)
      if (s && s.length) return s
      // fallback: scan localStorage keys for ones that match assistant storage pattern
      const fallbackPrefix = assistantToStorageKey(asst)
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('chat_') || k === fallbackPrefix)
      const mapped = keys.map((k) => {
        const id = k.replace(/^chat_/, '')
        const raw = localStorage.getItem(k) || '[]'
        try {
          const parsed = JSON.parse(raw)
          const last = Array.isArray(parsed) && parsed.length ? parsed[parsed.length - 1]?.content || '' : ''
          return { id: id || k, title: id || k, timestamp: Date.now(), last: last.slice(0, 200) }
        } catch {
          return { id: id || k, title: id || k, timestamp: Date.now(), last: '' }
        }
      })
      return mapped.slice(0, 50)
    } catch {
      return []
    }
  }

  const openSession = (s: SessionEntry) => {
    setActiveSession(s)
    setModalOpen(true)
  }

  const startNew = () => {
    // create new id by timestamp
    const id = `${assistant.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
    const entry: SessionEntry = { id, title: `Rozmowa ${new Date().toLocaleString()}`, timestamp: Date.now(), last: '' }
    // save as empty conversation
    localStorage.setItem(`chat_${entry.id}`, JSON.stringify([{ role: 'assistant', content: `Nowa rozmowa z ${assistant}`, timestamp: Date.now() }]))
    // update sessions index
    const sessionsKey = assistantSessionsKey(assistant)
    const prev = loadSessions(sessionsKey)
    prev.unshift(entry)
    localStorage.setItem(sessionsKey, JSON.stringify(prev.slice(0, 50)))
    setSessions(prev.slice(0, 50))
    openSession(entry)
  }

  return (
    <aside className={`flex flex-col transition-all bg-gray-50 border-r border-gray-200 ${collapsed ? 'w-16' : 'w-80'}`}>
      {/* Top assistant selector full width */}
      <div className={`${collapsed ? 'hidden' : ''}`}>
        <AssistantSelector value={assistant} onChange={(v) => setAssistant(v as any)} options={['Default', 'GPT', 'Todoist AI']} />
      </div>

      {/* header with controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        {!collapsed ? <div className="text-sm font-semibold text-gray-700">Historia — {assistant}</div> : <div className="text-xs uppercase text-gray-600">Historia</div>}
        <div className="flex items-center gap-2">
          <button onClick={loadList} title="Odśwież" className="p-1 rounded hover:bg-gray-100"><RefreshCw size={16} /></button>
          <button onClick={() => setCollapsed((s) => !s)} title={collapsed ? 'Rozwiń' : 'Zwiń'} className="p-1 rounded hover:bg-gray-100">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* controls */}
      <div className={`px-3 py-2 border-b bg-white ${collapsed ? 'hidden' : ''}`}>
        <button onClick={startNew} className="w-full text-sm bg-violet-600 text-white px-3 py-2 rounded-md shadow-sm hover:opacity-95">+ Nowa rozmowa</button>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="text-sm text-gray-500 p-3 italic">Brak zapisanych rozmów dla tego asystenta.</div>
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

      {/* modal */}
      {activeSession && (
        <ChatModal assistant={assistant} sessionId={activeSession.id} defaultTitle={activeSession.title} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      )}
    </aside>
  )
}
