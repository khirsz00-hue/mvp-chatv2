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
  const [taskObj, setTaskObj] = useState<{ id: string; title: string } | null>(initialTask || null)
  const [taskData, setTaskData] = useState<any>(initialTaskData || null)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // open when a task prop is provided
  useEffect(() => {
    if (initialTask) {
      setTaskObj(initialTask)
      setIsOpen(true)
    }
  }, [initialTask])

  useEffect(() => {
    if (initialTaskData) setTaskData(initialTaskData)
  }, [initialTaskData])

  // Robust loader: try multiple keys and fallback search
  useEffect(() => {
    if (!isOpen || !taskObj) return
    const candidates = [
      `chat_task_${taskObj.id}`,
      `chat_todoist_${taskObj.id}`,
      `chat_${taskObj.id}`,
    ]

    let foundKey: string | null = null
    for (const k of candidates) {
      if (localStorage.getItem(k)) {
        foundKey = k
        break
      }
    }

    if (!foundKey) {
      // search any key that contains the id and starts with chat_
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('chat_') && k.includes(taskObj.id)) {
          foundKey = k
          break
        }
      }
    }

    if (foundKey) {
      try {
        const saved = localStorage.getItem(foundKey) || '[]'
        const parsed = JSON.parse(saved)
        setChat(Array.isArray(parsed) ? parsed : [])
        return
      } catch (err) {
        console.error('Błąd odczytu historii z fallback key', err)
      }
    }

    // no history -> init intro
    const introMsg: ChatMessage = {
      role: 'assistant',
      content: `Zaczynamy! Pomagam Ci w zadaniu **${taskObj.title}**.`,
      timestamp: Date.now(),
    }
    setChat([introMsg])
    try {
      // write to canonical keys both for backward compatibility
      localStorage.setItem(`chat_task_${taskObj.id}`, JSON.stringify([introMsg]))
      localStorage.setItem(`chat_todoist_${taskObj.id}`, JSON.stringify([introMsg]))
    } catch {}
  }, [isOpen, taskObj])

  // Save chat to localStorage on changes + update sessions lists
  useEffect(() => {
    if (!taskObj) return
    try {
      const key1 = `chat_task_${taskObj.id}`
      const key2 = `chat_todoist_${taskObj.id}`
      const payload = JSON.stringify(chat)
      localStorage.setItem(key1, payload)
      localStorage.setItem(key2, payload)

      // update chat_sessions_task (for TaskDialog history list)
      const sessionsTask = JSON.parse(localStorage.getItem('chat_sessions_task') || '[]')
      const idx = sessionsTask.findIndex((s: any) => s.id === taskObj.id)
      const entry = {
        id: taskObj.id,
        title: taskObj.title,
        timestamp: Date.now(),
        last: chat[chat.length - 1]?.content?.slice(0, 200) || '',
      }
      if (idx >= 0) {
        sessionsTask[idx] = { ...sessionsTask[idx], ...entry }
      } else {
        sessionsTask.unshift(entry)
      }
      localStorage.setItem('chat_sessions_task', JSON.stringify(sessionsTask))

      // also update chat_sessions_todoist (used by ChatSidebar)
      const sessionsTodo = JSON.parse(localStorage.getItem('chat_sessions_todoist') || '[]')
      const idx2 = sessionsTodo.findIndex((s: any) => s.id === taskObj.id)
      if (idx2 >= 0) {
        sessionsTodo[idx2] = { ...sessionsTodo[idx2], ...entry }
      } else {
        sessionsTodo.unshift(entry)
      }
      localStorage.setItem('chat_sessions_todoist', JSON.stringify(sessionsTodo))
    } catch (err) {
      console.error('Błąd zapisu historii czatu:', err)
    }
  }, [chat, taskObj])

  // sendMessage (same pattern)
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !taskObj) return
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
          taskId: taskObj.id,
          taskTitle: taskObj.title,
          history: updated,
        }),
      })
      const data = await res.json()
      const reply = data.reply || data.content || 'Brak odpowiedzi'
      const ai: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
      const newChat = [...updated, ai]
      setChat(newChat)
      try {
        // persist under both canonical keys
        localStorage.setItem(`chat_task_${taskObj.id}`, JSON.stringify(newChat))
        localStorage.setItem(`chat_todoist_${taskObj.id}`, JSON.stringify(newChat))

        // update session entries as above
        const sessionsTask = JSON.parse(localStorage.getItem('chat_sessions_task') || '[]')
        const idx = sessionsTask.findIndex((s: any) => s.id === taskObj.id)
        const entry = {
          id: taskObj.id,
          title: taskObj.title,
          timestamp: Date.now(),
          last: ai.content.slice(0, 200),
        }
        if (idx >= 0) {
          sessionsTask[idx] = { ...sessionsTask[idx], ...entry }
        } else {
          sessionsTask.unshift(entry)
        }
        localStorage.setItem('chat_sessions_task', JSON.stringify(sessionsTask))

        const sessionsTodo = JSON.parse(localStorage.getItem('chat_sessions_todoist') || '[]')
        const idx2 = sessionsTodo.findIndex((s: any) => s.id === taskObj.id)
        if (idx2 >= 0) {
          sessionsTodo[idx2] = { ...sessionsTodo[idx2], ...entry }
        } else {
          sessionsTodo.unshift(entry)
        }
        localStorage.setItem('chat_sessions_todoist', JSON.stringify(sessionsTodo))
      } catch (err) {
        console.error('Błąd zapisu historii po sendMessage:', err)
      }
    } catch (err) {
      console.error('sendMessage error', err)
      setChat(prev => [...prev, { role: 'assistant', content: '⚠️ Błąd komunikacji z AI.', timestamp: Date.now() }])
    } finally {
      setLoading(false)
      // notify sidebar to refresh lists
      window.dispatchEvent(new Event('chatUpdated'))
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      setTaskObj(null)
      setTaskData(null)
      onClose?.()
    }, 200)
  }

  if (!isOpen || !taskObj) return null

  const modal = (
    <AnimatePresence>
      <motion.div key="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3" onClick={handleClose}>
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.2 }} className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 z-10 flex justify-between items-center px-5 py-3 border-b bg-gray-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 truncate pr-4">{taskObj.title}</h2>
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
