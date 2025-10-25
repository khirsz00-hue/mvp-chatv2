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

  useEffect(() => {
    const onInitial = (ev: any) => {
      const d = ev?.detail
      if (!d?.id) return
      const sessionId = d.id
      const msgId = `init-${sessionId}`

      // avoid duplicates
      if (pendingRef.current.has(msgId)) return
      pendingRef.current.add(msgId)

      const userText = `Pomóż mi z zadaniem: "${d.title || ''}". Opis: ${d.description || ''}`.trim()

      setMessages((prev) => {
        // If there's an initial assistant greeting only, replace it with user prompt + placeholder
        const assistantGreetingIndex = prev.findIndex(m => m.role === 'assistant' && /rozmawiasz z asystentem/i.test(m.text))
        if (assistantGreetingIndex !== -1) {
          const copy = [...prev]
          // remove greeting and insert user+placeholder at beginning
          copy.splice(assistantGreetingIndex, 1)
          return [...copy, { id: msgId, role: 'user', text: userText, ts: Date.now() }, { id: `${msgId}-pending`, role: 'assistant', text: 'Odpowiedź w toku...', ts: Date.now() }]
        }
        // If same msgId exists, skip appending
        if (prev.some(m => m.id === msgId || m.id === `${msgId}-pending`)) return prev
        return [...prev, { id: msgId, role: 'user', text: userText, ts: Date.now() }, { id: `${msgId}-pending`, role: 'assistant', text: 'Odpowiedź w toku...', ts: Date.now() }]
      })

      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Odpowiedź w toku...' } }))
      scrollToBottom()
    }

    const onReplySaved = (ev: any) => {
      const d = ev?.detail
      if (!d?.sessionId) return
      const sessionId = d.sessionId
      const reply = d.reply || ''
      const msgId = `init-${sessionId}`
      const placeholderId = `${msgId}-pending`
      setMessages((prev) => {
        const idx = prev.findIndex(m => m.id === placeholderId)
        if (idx !== -1) {
          const copy = [...prev]
          copy[idx] = { id: `${msgId}-resp`, role: 'assistant', text: reply, ts: Date.now() }
          return copy
        }
        // if no placeholder, append reply
        return [...prev, { id: `${msgId}-resp`, role: 'assistant', text: reply, ts: Date.now() }]
      })
      pendingRef.current.delete(msgId)
      window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Odpowiedź otrzymana' } }))
      scrollToBottom()
    }

    window.addEventListener('aiInitial', onInitial)
    window.addEventListener('aiReplySaved', onReplySaved)
    return () => {
      window.removeEventListener('aiInitial', onInitial)
      window.removeEventListener('aiReplySaved', onReplySaved)
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
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`${m.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-white text-gray-800'} rounded p-3 max-w-[85%]`}>
            <div>{m.text}</div>
            <div className="text-xs text-gray-400 mt-2">{new Date(m.ts || Date.now()).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <input placeholder="Napisz wiadomość..." className="flex-1 border rounded px-3 py-2" onKeyDown={(e: any) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              const val = e.currentTarget.value?.trim()
              if (!val) return
              window.dispatchEvent(new CustomEvent('aiManualSend', { detail: { message: val } }))
              e.currentTarget.value = ''
            }
          }} />
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => {
            const input = (document.querySelector('input[placeholder="Napisz wiadomość..."]') as HTMLInputElement)
            const v = input?.value?.trim()
            if (!v) return
            window.dispatchEvent(new CustomEvent('aiManualSend', { detail: { message: v } }))
            input.value = ''
          }}>Wyślij</button>
        </div>
      </div>
    </div>
  )
}
