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
  const pendingRef = useRef(new Set<string>()) // prevent duplicate user echoes
  const containerRef = useRef<HTMLDivElement | null>(null)

  const sessionStorageKey = (sessionId: string) => `ai_sent__${assistant || 'assistant'}__${sessionId}`

  useEffect(() => {
    const onInitial = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      const sessionId = d.id
      const msgId = `init-${sessionId}`
      // sessionStorage guard (prevents duplicates across components)
      try {
        if (sessionStorage.getItem(sessionStorageKey(sessionId))) return
        sessionStorage.setItem(sessionStorageKey(sessionId), '1')
      } catch {}

      // build initial user prompt
      const text = `Pomóż mi z zadaniem: "${d.title || ''}". Opis: ${d.description || ''}`.trim()
      if (pendingRef.current.has(msgId)) return
      pendingRef.current.add(msgId)
      // append user message locally
      setMessages((m) => [...m, { id: msgId, role: 'user', text, ts: Date.now() }])

      // call backend AI
      fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, assistant: assistant || 'Todoist Helper', sessionId }),
      })
        .then((r) => r.json())
        .then((j) => {
          const reply = j?.reply || j?.content || 'Brak odpowiedzi od AI.'
          setMessages((m) => [...m, { id: `${msgId}-resp`, role: 'assistant', text: reply, ts: Date.now() }])
          scrollToBottom()
        })
        .catch((e) => {
          console.error('ai error', e)
        })
        .finally(() => {
          pendingRef.current.delete(msgId)
        })
    }

    const onOpenFromSub = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      onInitial({ detail: { id: d.id, title: d.title, description: '' } })
    }

    window.addEventListener('aiInitial', onInitial)
    window.addEventListener('openTaskFromSubtask', onOpenFromSub)
    return () => {
      window.removeEventListener('aiInitial', onInitial)
      window.removeEventListener('openTaskFromSubtask', onOpenFromSub)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant, token])

  useEffect(() => {
    // optional: if an initialTaskId prop is provided, emit an aiInitial-like action
    if (initialTaskId) {
      const ev = new CustomEvent('aiInitial', { detail: { id: initialTaskId, title: '', description: '' } })
      window.dispatchEvent(ev)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setMessages((m) => [...m, { id: `${id}-r`, role: 'assistant', text: reply, ts: Date.now() }])
      scrollToBottom()
    } catch (e) {
      console.error('send ai error', e)
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
