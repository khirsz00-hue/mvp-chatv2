'use client'

import { useState } from 'react'
import Chat from '@/components/Chat'
import Sidebar from '@/components/Sidebar'
import { ChatMessage } from '@/lib/types'
import { useToasts } from '@/components/Toasts'

export default function HomePage() {
  const assistants = [
    { id: 'todoist', name: '📝 Todoist Helper' },
    { id: 'six_hats', name: '🎩 Six Thinking Hats' }
  ]

  const [active, setActive] = useState('todoist')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { toast, showToast, ToastComponent } = useToasts()

  const handleSend = async (msg: string) => {
    const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msg }
    setMessages(prev => [...prev, newMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: active, messages: [...messages, newMsg] })
      })

      if (!res.ok) throw new Error('Błąd połączenia z API')
      const data = await res.json()
      const reply: ChatMessage = {
        id: `${Date.now()}_ai`,
        role: 'assistant',
        content: data.answer
      }
      setMessages(prev => [...prev, reply])
    } catch (err) {
      console.error(err)
      showToast('⚠️ Wystąpił problem z odpowiedzią AI')
    }
  }

  return (
    <div className="flex gap-4">
      <Sidebar assistants={assistants} active={active} onSelect={setActive} />

      <div className="flex-1">
        <h1 className="text-2xl font-semibold mb-2">
          {assistants.find(a => a.id === active)?.name}
        </h1>
        <p className="text-neutral-600 mb-4">
  {active === 'todoist'
    ? 'Zarządzaj swoimi zadaniami, pytaj o plan i proś o rozbicie na kroki.'
    : 'Analizuj decyzje metodą 6 kapeluszy myślowych – krok po kroku.'}
</p>

{/* ✅ Sekcja integracji Todoist */}
{active === 'todoist' && (
  <TodoistConnection />
)}

        <Chat onSend={handleSend} messages={messages} />
        <ToastComponent />
      </div>
    </div>
  )
}
