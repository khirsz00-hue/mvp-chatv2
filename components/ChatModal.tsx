'use client'

import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage, assistantToStorageKey, assistantSessionsKey, loadConversation, saveConversation, upsertSession } from '../utils/chatStorage'

export default function ChatModal({
  assistant,
  sessionId,
  defaultTitle,
  isOpen,
  onClose,
}: {
  assistant: 'Default' | 'GPT' | 'Todoist AI'
  sessionId?: string // if not provided, operate on assistant-level storage
  defaultTitle?: string
  isOpen: boolean
  onClose: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const storageKey = sessionId ? `chat_${sessionId}` : assistantToStorageKey(assistant)
  const sessionsKey = assistantSessionsKey(assistant)
  const title = defaultTitle || (sessionId ? `Rozmowa: ${sessionId}` : `Asystent: ${assistant}`)

  useEffect(() => {
    if (!isOpen) return
    const conv = loadConversation(storageKey)
    setMessages(conv.length ? conv : [
      { role: 'assistant', content: `Cześć — to rozmowa z asystentem ${assistant}.`, timestamp: Date.now() },
    ])
    // scroll after small delay
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60)
  }, [isOpen, storageKey, assistant])

  useEffect(() => {
    // persist every change
    saveConversation(storageKey, messages)
    // update sessions index with last
    try {
      const last = messages[messages.length - 1]?.content || ''
      upsertSession(sessionsKey, { id: sessionId || assistantToStorageKey(assistant), title, timestamp: Date.now(), last: last.slice(0, 300) })
      // emit refresh event for sidebar
      window.dispatchEvent(new Event('chatUpdated'))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setLoading(true)
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setMessages((m) => [...m, userMsg])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, assistant }),
      })
      const data = await res.json()
      const reply = data?.reply || data?.content || 'Brak odpowiedzi od AI.'
      const aiMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
      setMessages((m) => [...m, userMsg, aiMsg])
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
    } catch (err) {
      console.error('sendMessage error', err)
      setMessages((m) => [...m, userMsg, { role: 'assistant', content: '⚠️ Błąd komunikacji z AI.', timestamp: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage()
  }

  if (!isOpen) return null

  const modal = (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
        <motion.div initial={{ scale: 0.98, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 12 }} className="w-full max-w-3xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 truncate max-w-[70vw]">{title}</h3>
              <div className="text-xs text-gray-500">Asystent: {assistant}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Zamknij</button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] ${m.role === 'user' ? 'self-end text-white bg-blue-600 rounded-lg p-3' : 'self-start bg-white border border-gray-200 rounded-lg p-3'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                  {m.content}
                </ReactMarkdown>
                <div className="text-[10px] text-gray-400 mt-1">{new Date(m.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="border-t bg-white p-3 flex gap-2 items-center">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Napisz wiadomość..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={sendMessage} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Wyślij</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return typeof window !== 'undefined' ? ReactDOM.createPortal(modal, document.body) : null
}
