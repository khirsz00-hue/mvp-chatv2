'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import AssistantSelector from './AssistantSelector'

interface ChatSidebarProps {
  onSelectChat?: (mode: 'global' | 'task' | 'six_hats' | 'todoist', task?: { id: string; content: string }) => void
}

type ChatPreview = { content: string; date: string; timestamp: number }
type TaskPreview = { id: string; title: string; last: string; date: string; timestamp: number }
type TodoistSession = { id: string; title: string; timestamp: number; last?: string; description?: string }

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState<'global' | 'task' | 'six_hats' | 'todoist'>('todoist')
  const [globalChats, setGlobalChats] = useState<ChatPreview[]>([])
  const [taskChats, setTaskChats] = useState<TaskPreview[]>([])
  const [sixHatsChats, setSixHatsChats] = useState<ChatPreview[]>([])
  const [todoistSessions, setTodoistSessions] = useState<TodoistSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [assistant, setAssistant] = useState<string>('Default')

  // load chats
  const loadChats = () => {
    if (typeof window === 'undefined') return

    const globalData = JSON.parse(localStorage.getItem('chat_global') || '[]') as any[]
    const global: ChatPreview[] = globalData.filter((m: any) => m.role === 'user').map((m: any) => ({
      content: m.content,
      date: new Date(m.timestamp).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      timestamp: m.timestamp || 0,
    }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15)
    setGlobalChats(global)

    const keys = Object.keys(localStorage)
    const tasksFromChats: TaskPreview[] = keys.filter((k: string) => k.startsWith('chat_task_') || k.startsWith('chat_todoist_') || k.startsWith('chat_')).map((k: string) => {
      try {
        const chat = JSON.parse(localStorage.getItem(k) || '[]') as any[]
        const lastMsg = chat[chat.length - 1]
        const id = k.replace(/^chat_/, '').replace(/^task_/, '').replace(/^todoist_/, '').replace(/^chat_todoist_/, '').replace(/^chat_task_/, '')
        const title = localStorage.getItem(`task_title_${id}`) || localStorage.getItem(`task_title_${id}`) || (lastMsg?.content ? lastMsg.content.slice(0, 80) : 'Zadanie bez nazwy')
        const date = lastMsg?.timestamp ? new Date(lastMsg.timestamp).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'brak daty'
        return { id, title, last: lastMsg?.content || '(brak wiadomości)', date, timestamp: lastMsg?.timestamp || 0 }
      } catch {
        return { id: k, title: k, last: '(brak)', date: '', timestamp: 0 }
      }
    })

    // also sessions saved by TaskDialog
    const sessions = JSON.parse(localStorage.getItem('chat_sessions_task') || '[]') as any[]
    const tasksFromSessions: TaskPreview[] = sessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      last: s.last || '(brak wiadomości)',
      date: new Date(s.timestamp).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      timestamp: s.timestamp,
    }))

    const mergedTasks: TaskPreview[] = [...tasksFromSessions, ...tasksFromChats.filter((t) => !tasksFromSessions.some((s) => s.id === t.id))].sort((a, b) => b.timestamp - a.timestamp).slice(0, 25)
    setTaskChats(mergedTasks)

    const sixData = JSON.parse(localStorage.getItem('chat_six_hats') || '[]') as any[]
    const sixHats: ChatPreview[] = sixData.filter((m: any) => m.role === 'user').map((m: any) => ({ content: m.content, date: new Date(m.timestamp).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), timestamp: m.timestamp || 0 })).sort((a, b) => b.timestamp - a.timestamp).slice(0, 15)
    setSixHatsChats(sixHats)

    const rawSessions = JSON.parse(localStorage.getItem('chat_sessions_todoist') || '[]') as any[]
    const sessionsData: TodoistSession[] = rawSessions.map((s: any) => {
      const messages = JSON.parse(localStorage.getItem(`chat_todoist_${s.id}`) || '[]') as any[]
      const lastMsg = messages[messages.length - 1]
      return { ...s, last: lastMsg?.content || '(brak wiadomości)' }
    }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 25)
    setTodoistSessions(sessionsData)
  }

  useEffect(() => {
    loadChats()
    window.addEventListener('storage', loadChats)
    window.addEventListener('chatUpdated', loadChats)
    return () => {
      window.removeEventListener('storage', loadChats)
      window.removeEventListener('chatUpdated', loadChats)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = (mode: 'global' | 'task' | 'six_hats' | 'todoist', session: any) => {
    const id = session.id ?? session.key ?? session.id
    setActiveSessionId(id)
    onSelectChat?.(mode, { id, content: session.title || session.last || '' })

    if (mode === 'todoist' || mode === 'task') {
      const detail = { mode: 'todoist', task: { id, title: session.title || session.last || '', description: (session as any).description || '' } }
      window.dispatchEvent(new CustomEvent('taskSelect', { detail }))
      window.dispatchEvent(new CustomEvent('taskHelp', { detail }))
    }
  }

  return (
    <div className={`w-[300px] md:w-[300px] border-r border-gray-200 bg-gray-50 h-full flex flex-col transition-all ${collapsed ? 'translate-x-[-100%] md:translate-x-0 md:w-16' : ''}`}>
      {/* collapse handle */}
      <div className="flex items-center justify-between p-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <AssistantSelector value={assistant} onChange={(v) => setAssistant(v)} options={['Default', 'GPT', 'Todoist AI']} />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadChats} className="p-1 rounded hover:bg-gray-100"><RefreshCw size={16} /></button>
          <button onClick={() => setCollapsed((s) => !s)} className="p-1 rounded hover:bg-gray-100">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className={`flex border-b bg-gray-100 text-sm font-medium text-gray-600 ${collapsed ? 'hidden md:flex' : ''}`}>
        {[
          { key: 'global', label: 'Globalne', count: globalChats.length },
          { key: 'task', label: 'Zadania', count: taskChats.length },
          { key: 'six_hats', label: 'Six Hats', count: sixHatsChats.length },
          { key: 'todoist', label: 'Todoist', count: todoistSessions.length },
        ].map((t) => (
          <button key={t.key} className={`flex-1 py-2 ${tab === t.key ? 'bg-white text-green-700 font-semibold' : 'hover:bg-gray-200'}`} onClick={() => setTab(t.key as any)}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* list */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-2 text-sm ${collapsed ? 'hidden md:block' : ''}`}>
        {tab === 'todoist' && (todoistSessions.length === 0 ? <p className="text-gray-500 italic">Brak historii Todoist.</p> : todoistSessions.map((s) => (
          <div key={s.id} onClick={() => handleSelect('todoist', s)} title={s.last} className={`cursor-pointer border rounded-lg p-2 transition ${activeSessionId === s.id ? 'bg-green-100 border-green-300' : 'bg-white hover:bg-green-50'}`}>
            <p className="font-medium text-gray-800 truncate">{s.title}</p>
            <p className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-xs text-gray-600 italic truncate">{s.last}</p>
          </div>
        )))}

        {tab === 'task' && (taskChats.length === 0 ? <p className="text-gray-500 italic">Brak rozmów z zadaniami.</p> : taskChats.map((t) => (
          <div key={t.id} onClick={() => handleSelect('task', t)} title={t.last} className={`cursor-pointer border rounded-lg p-2 transition ${activeSessionId === t.id ? 'bg-green-100 border-green-300' : 'bg-white hover:bg-green-50'}`}>
            <p className="font-medium text-gray-800 truncate">{t.title}</p>
            <p className="text-xs text-gray-500">{t.date}</p>
            <p className="text-xs text-gray-600 italic truncate">{t.last}</p>
          </div>
        )))}

        {tab === 'six_hats' && (sixHatsChats.length === 0 ? <p className="text-gray-500 italic">Brak rozmów Six Hats.</p> : sixHatsChats.map((chat, i) => (
          <div key={i} onClick={() => handleSelect('six_hats', { id: `six_${i}`, title: chat.content })} title={chat.content} className={`cursor-pointer border rounded-lg p-2 transition ${activeSessionId === `six_${i}` ? 'bg-green-100 border-green-300' : 'bg-white hover:bg-green-50'}`}>
            <p className="text-xs text-gray-500">{chat.date}</p>
            <p className="truncate text-gray-800">{chat.content}</p>
          </div>
        )))}

        {tab === 'global' && (globalChats.length === 0 ? <p className="text-gray-500 italic">Brak rozmów globalnych.</p> : globalChats.map((chat, i) => (
          <div key={i} onClick={() => handleSelect('global', { id: `global_${i}`, title: chat.content })} title={chat.content} className={`cursor-pointer border rounded-lg p-2 transition ${activeSessionId === `global_${i}` ? 'bg-green-100 border-green-300' : 'bg-white hover:bg-green-50'}`}>
            <p className="text-xs text-gray-500">{chat.date}</p>
            <p className="truncate text-gray-800">{chat.content}</p>
          </div>
        )))}
      </div>
    </div>
  )
}
