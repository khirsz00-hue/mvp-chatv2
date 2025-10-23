'use client'

import { useEffect, useState, useRef } from 'react'
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
  initialTaskData?: { description?: string; subtasks?: any[]; project?: string; due?: string; created_at?: string }
}

type TaskMeta = { estMinutes?: number; priority?: number }

function loadTaskMeta(id: string): TaskMeta {
  try {
    const raw = localStorage.getItem(`task_meta_${id}`)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveTaskMeta(id: string, meta: TaskMeta) {
  try {
    localStorage.setItem(`task_meta_${id}`, JSON.stringify(meta))
    window.dispatchEvent(new Event('taskUpdated'))
  } catch {}
}

export default function TaskDialog({ task: initialTask, mode = 'task', onClose, initialTaskData }: TaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [taskObj, setTaskObj] = useState<{ id: string; title: string } | null>(initialTask || null)
  const [taskData, setTaskData] = useState<any>(initialTaskData || null)
  const [meta, setMeta] = useState<TaskMeta>({})
  const [input, setInput] = useState('')
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialTask) {
      setTaskObj(initialTask)
      setIsOpen(true)
      setTaskData(initialTaskData || null)
      setMeta(loadTaskMeta(initialTask.id || ''))
    }
  }, [initialTask, initialTaskData])

  // If mode is 'task' we don't load chat history here (ChatModal handles chat). TaskDialog is readonly view for task.
  useEffect(() => {
    if (!taskObj) return
    if (mode !== 'task') {
      // load chat history for help mode if used
      const candidates = [`chat_task_${taskObj.id}`, `chat_todoist_${taskObj.id}`, `chat_${taskObj.id}`]
      let foundKey: string | null = null
      for (const k of candidates) {
        if (localStorage.getItem(k)) {
          foundKey = k
          break
        }
      }
      if (!foundKey) {
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
        } catch {}
      }
      // default intro
      const introMsg: ChatMessage = { role: 'assistant', content: `Cześć — rozmawiasz z asystentem dla zadania **${taskObj.title}**.`, timestamp: Date.now() }
      setChat([introMsg])
      try {
        localStorage.setItem(`chat_task_${taskObj.id}`, JSON.stringify([introMsg]))
      } catch {}
    }
  }, [taskObj, mode])

  // Save chat if in help mode
  useEffect(() => {
    if (mode !== 'task' && taskObj) {
      try {
        const key = `chat_task_${taskObj.id}`
        localStorage.setItem(key, JSON.stringify(chat || []))
        // update sessions index
        const sessions = JSON.parse(localStorage.getItem('chat_sessions_task') || '[]')
        const idx = sessions.findIndex((s: any) => s.id === taskObj.id)
        const entry = { id: taskObj.id, title: taskObj.title, timestamp: Date.now(), last: chat[chat.length - 1]?.content?.slice(0, 200) || '' }
        if (idx >= 0) sessions[idx] = { ...sessions[idx], ...entry }
        else sessions.unshift(entry)
        localStorage.setItem('chat_sessions_task', JSON.stringify(sessions))
        window.dispatchEvent(new Event('chatUpdated'))
      } catch {}
    }
  }, [chat, taskObj, mode])

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      setTaskObj(null)
      setTaskData(null)
      onClose?.()
    }, 200)
  }

  // sendMessage only relevant when mode !== 'task' (help/chat)
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !taskObj) return
    setInput('')
    setLoading(true)
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setChat((c) => [...c, userMsg])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: 'task', taskId: taskObj.id, taskTitle: taskObj.title, history: chat }),
      })
      const data = await res.json()
      const reply = data.reply || data.content || 'Brak odpowiedzi'
      const ai: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
      setChat((c) => [...c, userMsg, ai])
    } catch (err) {
      console.error(err)
      setChat((c) => [...c, { role: 'assistant', content: '⚠️ Błąd komunikacji z AI.', timestamp: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  // Save task meta (est time / priority)
  const saveMeta = (newMeta: TaskMeta) => {
    if (!taskObj) return
    const merged = { ...meta, ...newMeta }
    setMeta(merged)
    saveTaskMeta(taskObj.id, merged)
  }

  if (!isOpen || !taskObj) return null

  const modal = (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-3" onClick={handleClose}>
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.18 }} className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{taskObj.title}</h2>
              <div className="text-sm text-gray-500 mt-1">{taskData?.description ? '' : 'Brak opisu — możesz dodać w edycji zadania.'}</div>
            </div>
            <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700">✕ Zamknij</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
            {/* TASK DETAILS (readonly view) */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-600 mb-2">Opis zadania</div>
              {taskData?.description ? (
                <div className="prose max-w-none text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{taskData.description}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">Brak opisu — możesz dodać w edycji zadania.</div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-gray-500">Projekt</div><div className="text-gray-700">{taskData?.project || '—'}</div></div>
                <div><div className="text-xs text-gray-500">Utworzone</div><div className="text-gray-700">{taskData?.created_at ? new Date(taskData.created_at).toLocaleString() : '—'}</div></div>
                <div><div className="text-xs text-gray-500">Deadline</div><div className="text-gray-700">{taskData?.due || '—'}</div></div>
                <div><div className="text-xs text-gray-500">Subtaski</div>
                  <div className="text-gray-700">
                    {taskData?.subtasks && taskData.subtasks.length ? (
                      <ul className="list-disc ml-4 text-sm">{taskData.subtasks.map((s: any) => <li key={s.id}>{s.content}</li>)}</ul>
                    ) : '—'}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 items-center">
                <label className="text-xs text-gray-500">Est. czas (min)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={meta.estMinutes || ''} onChange={(e) => setMeta((m) => ({ ...m, estMinutes: Number(e.target.value) }))} placeholder="min" className="border px-2 py-1 rounded w-24 text-sm" />
                  <button className="px-3 py-1.5 bg-green-600 text-white rounded text-sm" onClick={() => saveMeta({ estMinutes: meta.estMinutes })}>Zapisz</button>
                </div>

                <label className="text-xs text-gray-500">Priorytet</label>
                <div className="flex items-center gap-2">
                  <select value={meta.priority ?? 1} onChange={(e) => setMeta((m) => ({ ...m, priority: Number(e.target.value) }))} className="border px-2 py-1 rounded text-sm">
                    <option value={4}>Highest</option>
                    <option value={3}>High</option>
                    <option value={2}>Medium</option>
                    <option value={1}>Low</option>
                  </select>
                  <button className="px-3 py-1.5 bg-green-600 text-white rounded text-sm" onClick={() => saveMeta({ priority: meta.priority })}>Zapisz</button>
                </div>
              </div>
            </div>

            {/* Chat area: only shown when not in strict task mode */}
            {mode !== 'task' && (
              <div className="bg-white rounded-lg p-3 border">
                <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-3 mb-3">
                  {chat.map((m, i) => (
                    <div key={i} className={`${m.role === 'user' ? 'self-end text-white bg-blue-600' : 'self-start bg-gray-100'} p-3 rounded-lg text-sm`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      <div className="text-[10px] text-gray-400 mt-1">{new Date(m.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Napisz np. 'Pogrupuj zadania'..." className="flex-1 border px-3 py-2 rounded text-sm" />
                  <button onClick={sendMessage} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">Wyślij</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return typeof window !== 'undefined' ? ReactDOM.createPortal(modal, document.body) : null
}
