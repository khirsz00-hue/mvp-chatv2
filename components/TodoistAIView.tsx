'use client'

import React, { useEffect, useRef, useState } from 'react'

type Message = { id: string; role: 'user' | 'assistant' | 'system'; text: string; ts?: number }

export default function TodoistAIView({
  assistant,
  initialTaskId,
}: {
  assistant?: string
  initialTaskId?: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const pendingRef = useRef(new Set<string>())
  const containerRef = useRef<HTMLDivElement | null>(null)

  const sessionKey = (id: string) => `ai_sent__${assistant || 'assistant'}__${id}`

  useEffect(() => {
    const handleInitial = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      const sessionId = d.id
      const msgId = `init-${sessionId}`

      // avoid double append
      if (pendingRef.current.has(msgId)) return
      pendingRef.current.add(msgId)

      const userText = `Pomóż mi z zadaniem: "${d.title || ''}".\n\nOpis: ${d.description || ''}`.trim()
      // Append user message + placeholder assistant
      setMessages((m) => {
        // if already exists, skip duplicate
        if (m.some((x) => x.id === msgId)) return m
        return [...m, { id: msgId, role: 'user', text: userText, ts: Date.now() }, { id: `${msgId}-pending`, role: 'assistant', text: 'Odpowiedź w toku...', ts: Date.now() }]
      })
      // notify user
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Odpowiedź w toku...' } }))
      scrollToBottom()
    }

    const handleReplySaved = (ev: any) => {
      const d = ev?.detail
      if (!d?.sessionId) return
      const id = d.sessionId
      const msgId = `init-${id}`
      const reply = d.reply || ''
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === `${msgId}-pending`)
        if (idx !== -1) {
          const copy = [...prev]
          copy[idx] = { id: `${msgId}-resp`, role: 'assistant', text: reply, ts: Date.now() }
          return copy
        }
        // fallback append
        return [...prev, { id: `${msgId}-resp`, role: 'assistant', text: reply, ts: Date.now() }]
      })
      pendingRef.current.delete(msgId)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Odpowiedź otrzymana' } }))
      scrollToBottom()
    }

    window.addEventListener('aiInitial', handleInitial)
    window.addEventListener('aiReplySaved', handleReplySaved)
    return () => {
      window.removeEventListener('aiInitial', handleInitial)
      window.removeEventListener('aiReplySaved', handleReplySaved)
    }
  }, [assistant])

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

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((m) => (
          <div key={m.id} className={`${m.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-white text-gray-800'} rounded p-3 max-w-[85%]`}>
            <div>{m.text}</div>
            <div className="text-xs text-gray-400 mt-2">{new Date(m.ts || Date.now()).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* input area - user can send follow-ups */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <input placeholder="Napisz wiadomość..." className="flex-1 border rounded px-3 py-2" onKeyDown={(e: any) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              const val = e.currentTarget.value?.trim()
              if (!val) return
              // emit as manual chat (simple flow)
              window.dispatchEvent(new CustomEvent('aiManualSend', { detail: { message: val } }))
              e.currentTarget.value = ''
            }
          }} />
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => {
            const input = (document.querySelector('input[placeholder="Napisz wiadomość..."]') as HTMLInputElement)
            const val = input?.value?.trim()
            if (!val) return
            window.dispatchEvent(new CustomEvent('aiManualSend', { detail: { message: val } }))
            input.value = ''
          }}>Wyślij</button>
        </div>
      </div>
    </div>
  )
}
