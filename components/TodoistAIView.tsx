'use client'

import React, { useEffect, useRef, useState } from 'react'

type Message = { id: string; role: 'user' | 'assistant' | 'system'; text: string; ts?: number }

export default function TodoistAIView({ initialTaskId }: { initialTaskId?: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const pendingRef = useRef(new Set<string>()) // to prevent duplicate user echoes
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onInitial = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      // build initial user prompt from task
      const msgId = `init-${d.id}`
      if (pendingRef.current.has(msgId)) return
      pendingRef.current.add(msgId)
      const text = `Pomóż mi z zadaniem: "${d.title || ''}". Opis: ${d.description || ''}`.trim()
      // push user message once
      setMessages((m) => [...m, { id: msgId, role: 'user', text, ts: Date.now() }])
      // call AI endpoint (example: /api/ai/chat) - here we simulate via local fetch
      fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text, taskId: d.id }) })
        .then((r) => r.json())
        .then((j) => {
          if (j?.reply) {
            setMessages((m) => [...m, { id: `${msgId}-resp`, role: 'assistant', text: j.reply, ts: Date.now() }])
            scrollToBottom()
          }
        })
        .catch((e) => {
          console.error('ai error', e)
        })
    }
    const onOpenFromSub = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      // treat like initial
      onInitial({ detail: { id: d.id, title: d.title, description: '' } })
    }

    window.addEventListener('aiInitial', onInitial)
    window.addEventListener('openTaskFromSubtask', onOpenFromSub)
    return () => {
      window.removeEventListener('aiInitial', onInitial)
      window.removeEventListener('openTaskFromSubtask', onOpenFromSub)
    }
  }, [])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
    }, 50)
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const id = `u-${Date.now()}`
    // prevent double echo: add to pending then only append once
    if (pendingRef.current.has(id)) return
    pendingRef.current.add(id)
    setMessages((m) => [...m, { id, role: 'user', text: input, ts: Date.now() }])
    const payload = { prompt: input }
    setInput('')
    try {
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => ({}))
      if (j?.reply) {
        setMessages((m) => [...m, { id: `${id}-r`, role: 'assistant', text: j.reply, ts: Date.now() }])
        scrollToBottom()
      }
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
