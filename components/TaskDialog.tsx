'use client'

import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface TaskDialogProps {
  task?: { id: string; title: string }
  mode?: 'help' | 'task' | 'todoist'
  onClose?: () => void
  // optional initial data (description, subtasks) — parent can pass full task object
  initialTaskData?: { description?: string; subtasks?: any[] }
}

export default function TaskDialog({ task: initialTask, mode = 'help', onClose, initialTaskData }: TaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [modeState, setModeState] = useState<'help' | 'task' | 'todoist'>(mode)
  const [task, setTask] = useState<{ id: string; title: string } | null>(initialTask || null)
  const [taskData, setTaskData] = useState<any>(initialTaskData || null)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // open on mount if we have a task
  useEffect(() => {
    if (initialTask) {
      setTask(initialTask)
      setIsOpen(true)
    }
  }, [initialTask])

  // if initialTaskData changes, update
  useEffect(() => {
    if (initialTaskData) setTaskData(initialTaskData)
  }, [initialTaskData])

  // load chat history similarly as before (existing logic)...
  // For brevity keep existing local chat logic (unchanged except that we use 'task' variable)

  useEffect(() => {
    if (!isOpen || !task) return
    const chatKey = task ? `chat_task_${task.id}` : null
    if (!chatKey) return
    try {
      const saved = localStorage.getItem(chatKey)
      if (saved) setChat(JSON.parse(saved))
      else setChat([])
    } catch {
      setChat([])
    }
  }, [isOpen, task])

  useEffect(() => {
    if (task) {
      // auto intro if no chat
      if (chat.length === 0) {
        const intro: ChatMessage = {
          role: 'assistant',
          content: `Rozpoczynam rozmowę o zadaniu **${task.title}**.`,
          timestamp: Date.now(),
        }
        setChat([intro])
        try {
          if (task) localStorage.setItem(`chat_task_${task.id}`, JSON.stringify([intro]))
        } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task])

  useEffect(() => {
    try {
      if (task) localStorage.setItem(`chat_task_${task.id}`, JSON.stringify(chat))
    } catch {}
  }, [chat, task])

  // send message (same as before)
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !task) return
    setInput('')
    setLoading(true)
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const updated = [...chat, userMsg]
    setChat(updated)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: modeState,
          taskId: task.id,
          taskTitle: task.title,
          history: updated,
        }),
      })
      const data = await res.json()
      const reply = data.reply || data.content || 'Brak odpowiedzi'
      const ai: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
      const newChat = [...updated, ai]
      setChat(newChat)
      try {
        localStorage.setItem(`chat_task_${task.id}`, JSON.stringify(newChat))
      } catch {}
    } catch (err) {
      console.error('sendMessage error', err)
      setChat(prev => [...prev, { role: 'assistant', content: '⚠️ Błąd komunikacji z AI.', timestamp: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      setTask(null)
      setTaskData(null)
      onClose?.()
    }, 200)
  }

  if (!isOpen || !task) return null

  const modal = (
    <AnimatePresence>
      <motion.div key="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3" onClick={handleClose}>
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.2 }} className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 z-10 flex justify-between items-center px-5 py-3 border-b bg-gray-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 truncate pr-4">{task.title}</h2>
              {taskData?.description ? (
                <div className="text-sm text-gray-600 mt-1 max-w-[70vw]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {taskData.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-1">Brak opisu — możesz dodać w edycji zadania.</div>
              )}
            </div>

            <div>
              <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700 transition">✕ Zamknij</button>
            </div>
          </div>

          {/* CHAT / DETAILS */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
            {chat.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm shadow-sm ${m.role === 'user' ? 'self-end bg-blue-600 text-white' : 'self-start bg-white border border-gray-200 text-gray-800'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                  {m.content}
                </ReactMarkdown>
              </div>
            ))}

            {taskData?.subtasks && taskData.subtasks.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-2">Subtaski:</div>
                <ul className="space-y-1">
                  {taskData.subtasks.map((s: any) => (
                    <li key={s.id} className="text-sm text-gray-700">
                      • {s.content}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {loading && <div className="text-sm text-gray-500 animate-pulse">AI myśli...</div>}
          </div>

          {/* INPUT */}
          <div className="sticky bottom-0 border-t bg-white flex p-3 space-x-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Napisz np. 'Pogrupuj zadania'..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={sendMessage} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">Wyślij</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return typeof window !== 'undefined' ? ReactDOM.createPortal(modal, document.body) : null
}
