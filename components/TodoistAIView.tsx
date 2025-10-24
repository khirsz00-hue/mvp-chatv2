'use client'

import React, { useEffect, useRef, useState } from 'react'

type Message = { id: string; role: 'user' | 'assistant' | 'system'; text: string; ts?: number }

export default function TodoistAIView({
  token,
  assistant,
  initialTaskId,
}: {
  token?: string
  assistant?: string
  initialTaskId?: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const pendingRef = useRef(new Set<string>())
  const containerRef = useRef<HTMLDivElement | null>(null)

  const sessionStorageKey = (sessionId: string) => `ai_sent__${assistant || 'assistant'}__${sessionId}`

  useEffect(() => {
    const onInitial = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      const sessionId = d.id
      const msgId = `init-${sessionId}`
      try {
        if (sessionStorage.getItem(sessionStorageKey(sessionId))) {
          // already sent — but still ensure UI shows messages stored in conversation
        } else {
          sessionStorage.setItem(sessionStorageKey(sessionId), '1')
        }
      } catch {}
      const text = `Pomóż mi z zadaniem: "${d.title || ''}". Opis: ${d.description || ''}`.trim()
      if (pendingRef.current.has(msgId)) return
      pendingRef.current.add(msgId)

      // push user message + assistant placeholder
      setMessages((m) => [...m, { id: msgId, role: 'user', text, ts: Date.now() }])
      const placeholderId = `${msgId}-pending`
      setMessages((m) => [...m, { id: placeholderId, role: 'assistant', text: 'Odpowiedź w toku...', ts: Date.now() }])
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Odpowiedź w toku...' } }))
      scrollToBottom()
      // wait for aiReplySaved to replace placeholder
    }

    const onReplySaved = (ev: any) => {
      const d = ev?.detail
      if (!d?.sessionId) return
      const sessionId = d.sessionId
      const reply = d.reply || ''
      const msgId = `init-${sessionId}`
      const placeholderId = `${msgId}-pending`
      setMessages((prev) => {
        const found = prev.findIndex((m) => m.id === placeholderId)
        if (found !== -1) {
          const copy = [...prev]
          copy[found] = { id: `${msgId}-resp`, role: 'assistant', text: reply, ts: Date.now() }
          return copy
        }
        return [...prev, { id: `${msgId}-resp`, role: 'assistant', text: reply, ts: Date.now() }]
      })
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Odpowiedź otrzymana' } }))
      pendingRef.current.delete(msgId)
      scrollToBottom()
    }

    window.addEventListener('aiInitial', onInitial)
    window.addEventListener('aiReplySaved', onReplySaved)
    return () => {
      window.removeEventListener('aiInitial', onInitial)
      window.removeEventListener('aiReplySaved', onReplySaved)
    }
  }, [assistant, token])

  useEffect(() => {
    if (initialTaskId) {
      window.dispatchEvent(new CustomEvent('aiInitial', { detail: { id: initialTaskId, title: '', description: '' } }))
    }
  }, [initialTaskId])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
    }, 50)
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const id = `u-${Date.now()}`
    if (pendingRef.current.has(id)) return
    pendingRef.current.add(id)
    setMessages((m) => [...m, { id, role: 'user', text: input, ts: Date.now() }])
    const placeholderId = `${id}-pending`
    setMessages((m) => [...m, { id: placeholderId, role: 'assistant', text: 'Odpowiedź w toku...', ts: Date.now() }])
    scrollToBottom()
    const payload = { prompt: input, assistant: assistant || 'Assistant' }
    setInput('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      const reply = j?.reply || j?.content || 'Brak odpowiedzi od AI.'
      setMessages((m) => {
        const found = m.findIndex((x) => x.id === placeholderId)
        if (found !== -1) {
          const copy = [...m]
          copy[found] = { id: `${id}-r`, role: 'assistant', text: reply, ts: Date.now() }
          return copy
        }
        return [...m, { id: `${id}-r`, role: 'assistant', text: reply, ts: Date.now() }]
      })
      scrollToBottom()
    } catch (e) {
      console.error('send ai error', e)
      setMessages((m) => m.map((mm) => mm.id === placeholderId ? { ...mm, text: 'Błąd: nie otrzymano odpowiedzi' } : mm))
    } finally {
      pendingRef.current.delete(id)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`${m.role === 'user' ? 'bg-blue-600 text-white self-end' : 'bg-white text-gray-800'} rounded p-3 max-w-[95%]`}>
            <div>{m.text}</div>
            <div className="text-xs text-gray-400 mt-2">{new Date(m.ts || Date.now()).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex items-center gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Napisz wiadomość..." className="flex-1 border rounded px-3 py-2" />
        <button onClick={sendMessage} className="px-3 py-2 bg-blue-600 text-white rounded">Wyślij</button>
      </div>
    </div>
  )
}
