'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import Separator from '@/components/ui/Separator'
import Card from '@/components/ui/Card'
import { Select, SelectOption } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import {
  CheckCircle,
  Trash,
  CalendarBlank,
  Flag,
  FolderOpen,
  Clock,
  Timer,
  Brain,
  Sparkle,
  Tag,
  Stop,
  Play,
  Plus,
  ArrowClockwise,
  Lightning,
  ListChecks,
  ChatCircle,
  ClockClockwise,
  CaretDown,
  CaretUp,
  X
} from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useTaskTimer } from './TaskTimer'
import { AITaskBreakdownModal } from './AITaskBreakdownModal'
import { PomodoroTimer } from './PomodoroTimer'
import { TaskChatModal } from './TaskChatModal'
import {
  listSubtasksLocal,
  addSubtaskLocal,
  updateSubtaskLocal,
  type LocalSubtask
} from '@/utils/localTaskStore'

/* =======================
   TYPES
======================= */

interface Task {
  id: string
  content: string
  description?: string
  project_id?: string
  project_name?: string
  priority: 1 | 2 | 3 | 4
  due?: { date: string } | string
  created_at?: string
  duration?: number
  estimated_minutes?: number
  labels?: string[]
  subtasks?: Array<{ id: string; content: string; completed?: boolean }>
}

interface SubtaskItem {
  id: string
  parentId?: string
  content: string
  createdAt?: number
  completed?: boolean
}

/* =======================
   HELPER FUNCTIONS
======================= */

/**
 * Parse due date from task object to string format
 */
const parseDueDate = (due?: { date: string } | string): string => {
  return typeof due === 'string' ? due : due?.date || ''
}

/**
 * Safely format date string with error handling
 */
const formatDateSafely = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: pl })
  } catch {
    return dateStr
  }
}

/**
 * Format seconds into HH:MM:SS for timer readouts.
 */
const formatStopwatch = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
}

const POMODORO_WORK_DURATION = 25 * 60
const POMODORO_SHORT_BREAK_DURATION = 5 * 60
const POMODORO_LONG_BREAK_DURATION = 15 * 60

interface MinimalSubtaskShape {
  id: string
  content?: string
  title?: string
  completed?: boolean
  parentId?: string
  createdAt?: number
}

type RawSubtask =
  | SubtaskItem
  | LocalSubtask
  | MinimalSubtaskShape

interface StoredTimerState {
  taskId?: string
  taskTitle?: string
  startTime?: number
  elapsedSeconds?: number
  isRunning?: boolean
  isPaused?: boolean
}

interface StoredPomodoroState {
  taskId?: string
  taskTitle?: string
  phase?: 'work' | 'shortBreak' | 'longBreak'
  remainingSeconds?: number
  isRunning?: boolean
}

const hasTitle = (s: RawSubtask): s is MinimalSubtaskShape =>
  'title' in s && typeof (s as MinimalSubtaskShape).title === 'string'

const isStoredTimerState = (value: any): value is StoredTimerState =>
  Boolean(value) && typeof value === 'object'

const isStoredPomodoroState = (value: any): value is StoredPomodoroState =>
  Boolean(value) && typeof value === 'object'

const normalizeSubtasks = (
  items: RawSubtask[] = [],
  parentId?: string
) =>
  items.reduce<SubtaskItem[]>((acc, raw) => {
    if (!raw) return acc
    const fallbackTitle = hasTitle(raw) ? raw.title : ''
    const mainContent = typeof raw.content === 'string' ? raw.content : ''
    const id = String(raw.id ?? '').trim()
    // Ensure we always produce a string (fallbackTitle may be undefined)
    const content = String(mainContent || fallbackTitle || '')
    if (id === '' || content.trim() === '') return acc

    acc.push({
      id,
      parentId: raw.parentId || parentId,
      content,
      createdAt: raw.createdAt,
      completed: Boolean(raw.completed)
    })
    return acc
  }, [])

const mergeSubtasks = (...groups: SubtaskItem[][]): SubtaskItem[] => {
  const map = new Map<string, SubtaskItem>()
  groups.flat().forEach(st => {
    if (st?.id && !map.has(st.id)) {
      map.set(st.id, st)
    }
  })
  return Array.from(map.values())
}

interface TaskDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onUpdate: (taskId: string, updates: Partial<Task>) => void | Promise<void>
  onDelete: (taskId: string) => void | Promise<void>
  onComplete: (taskId: string) => void | Promise<void>
  onDuplicate?: (task: Task) => void | Promise<void>
}

/* =======================
   COMPONENT
======================= */

export function TaskDetailsModal({
  open,
  onOpenChange,
  task,
  onUpdate,
  onDelete,
  onComplete
}: TaskDetailsModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4)
  const [projectId, setProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(0)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [loadingAISuggestions, setLoadingAISuggestions] = useState(false)
  const [timeTrackingExpanded, setTimeTrackingExpanded] = useState(false)
  const [activeTimeTab, setActiveTimeTab] = useState<'manual' | 'pomodoro'>('manual')

  const [aiUnderstanding, setAiUnderstanding] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const fetchedTaskIdRef = useRef<string | null>(null)

  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([])
  const [subtasksLoading, setSubtasksLoading] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [changeHistory, setChangeHistory] = useState<Array<{
    timestamp: string
    field: string
    oldValue: string
    newValue: string
  }>>([])
  const lastValuesRef = useRef<{
    title: string
    description: string
    priority: number
    dueDate: string
  }>({
    title: '',
    description: '',
    priority: 4,
    dueDate: ''
  })
  const [timerInfo, setTimerInfo] = useState<{
    isActive: boolean
    isForThisTask: boolean
    elapsedSeconds: number
    isPomodoro?: boolean
    pomodoroPhase?: string
    pomodoroRemaining?: number
  }>({
    isActive: false,
    isForThisTask: false,
    elapsedSeconds: 0
  })

  const { startTimer, stopTimer, getActiveTimer } = useTaskTimer()
  const { showToast } = useToast()

  /* =======================
     FETCH PROJECTS
  ======================= */

  useEffect(() => {
    const fetchProjects = async () => {
      const token = localStorage.getItem('todoist_token')
      if (!token) return

      try {
        const res = await fetch(`/api/todoist/projects?token=${token}`)
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
        }
      } catch (err) {
        console.error('Error fetching projects:', err)
      }
    }

    if (open) {
      fetchProjects()
    }
  }, [open])

  /* =======================
     AI UNDERSTANDING
  ======================= */

  const fetchAIUnderstanding = useCallback(async (currentTask: Task, force = false, clarificationContext?: string) => {
    if (!currentTask || !currentTask.id || (!force && fetchedTaskIdRef.current === currentTask.id && !clarificationContext)) return

    fetchedTaskIdRef.current = currentTask.id
    setLoadingAI(true)

    const prompt = clarificationContext 
      ? `
Poprzednia analiza: ${aiUnderstanding}

Zadanie: ${currentTask.content}
Opis: ${currentTask.description || ''}

Kontekst doprecyzowania: ${clarificationContext}

Zaktualizuj swoją analizę zadania uwzględniając nowy kontekst. Bądź wspierający i konkretny (2-3 zdania).
`
      : `
Zadanie: ${currentTask.content}
Opis: ${currentTask.description || ''}

W 2–3 zdaniach wyjaśnij jak rozumiesz to zadanie.
Bądź wspierający i konkretny.
`

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await res.json()
      setAiUnderstanding(data.response || '')
    } catch (error) {
      console.error('Error fetching AI understanding:', error)
      setAiUnderstanding('Nie udało się pobrać analizy AI.')
    } finally {
      setLoadingAI(false)
    }
  }, [aiUnderstanding])

  /* =======================
     INIT TASK
  ======================= */

  useEffect(() => {
    if (!task?.id) {
      setAiUnderstanding('')
      setSubtasks([])
      setChangeHistory([])
      fetchedTaskIdRef.current = null
      lastValuesRef.current = {
        title: '',
        description: '',
        priority: 4,
        dueDate: ''
      }
      return
    }

    const initialTitle = task.content || ''
    const initialDescription = task.description || ''
    const initialDueDate = parseDueDate(task.due)
    const initialPriority = task.priority

    setTitle(initialTitle)
    setDescription(initialDescription)
    setDueDate(initialDueDate)
    setPriority(initialPriority)
    setProjectId(task.project_id || '')
    setProjectName(task.project_name || '')
    setLabels(task.labels || [])
    setEstimatedMinutes(task.estimated_minutes || 0)

    lastValuesRef.current = {
      title: initialTitle,
      description: initialDescription,
      priority: initialPriority,
      dueDate: initialDueDate
    }

    const loadSubtasks = async () => {
      setSubtasksLoading(true)
      try {
        const remote: SubtaskItem[] = []
        const res = await fetch(`/api/todoist/subtasks?parentId=${task.id}`)
        if (res.ok) {
          const data = await res.json()
          remote.push(...normalizeSubtasks(data.subtasks || [], task.id))
        } else {
          showToast('Nie udało się pobrać podzadań', 'error')
        }
        const merged = mergeSubtasks(
          remote,
          normalizeSubtasks(task.subtasks || [], task.id),
          normalizeSubtasks(listSubtasksLocal(task.id), task.id)
        )
        setSubtasks(merged)
      } catch (err) {
        console.error('Error loading subtasks', err)
        showToast('Błąd przy ładowaniu podzadań', 'error')
        setSubtasks(normalizeSubtasks(task.subtasks || [], task.id))
      } finally {
        setSubtasksLoading(false)
      }
    }
    loadSubtasks()

    if (fetchedTaskIdRef.current !== task.id) {
      setAiUnderstanding('')
      fetchAIUnderstanding(task)
    }
  }, [task, fetchAIUnderstanding, showToast])

  /* =======================
     LABEL HANDLERS
  ======================= */

  const handleAddLabel = () => {
    if (!newLabel.trim() || labels.includes(newLabel.trim())) return
    setLabels(prev => [...prev, newLabel.trim()])
    setNewLabel('')
  }

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(prev => prev.filter(l => l !== labelToRemove))
  }

  /* =======================
     AUTO SAVE
  ======================= */

  useEffect(() => {
    if (!task?.id || !onUpdate) return

    if (
      title === (task.content || '') &&
      description === (task.description || '') &&
      priority === task.priority &&
      dueDate === parseDueDate(task.due) &&
      projectId === (task.project_id || '') &&
      JSON.stringify(labels) === JSON.stringify(task.labels || []) &&
      estimatedMinutes === (task.estimated_minutes || 0)
    ) {
      return
    }

    const timeout = setTimeout(async () => {
      const now = new Date().toISOString()
      const changes: typeof changeHistory = []

      if (title !== lastValuesRef.current.title && lastValuesRef.current.title !== '') {
        changes.push({
          timestamp: now,
          field: 'Tytuł',
          oldValue: lastValuesRef.current.title,
          newValue: title
        })
      }

      if (description !== lastValuesRef.current.description && lastValuesRef.current.description !== '') {
        changes.push({
          timestamp: now,
          field: 'Opis',
          oldValue: lastValuesRef.current.description || '(pusty)',
          newValue: description || '(pusty)'
        })
      }

      if (priority !== lastValuesRef.current.priority && lastValuesRef.current.priority !== 0) {
        changes.push({
          timestamp: now,
          field: 'Priorytet',
          oldValue: `P${lastValuesRef.current.priority}`,
          newValue: `P${priority}`
        })
      }

      if (dueDate !== lastValuesRef.current.dueDate && lastValuesRef.current.dueDate !== '') {
        changes.push({
          timestamp: now,
          field: 'Termin',
          oldValue: lastValuesRef.current.dueDate || '(brak)',
          newValue: dueDate || '(brak)'
        })
      }

      if (changes.length > 0) {
        setChangeHistory(prev => [...changes, ...prev])
      }

      lastValuesRef.current = {
        title,
        description,
        priority,
        dueDate
      }

      // Update via Todoist API
      const token = localStorage.getItem('todoist_token')
      if (token) {
        try {
          await fetch('/api/todoist/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: task.id,
              token,
              content: title,
              description,
              priority,
              due: dueDate || undefined,
              project_id: projectId || undefined,
              labels: labels.length > 0 ? labels : undefined
            })
          })
        } catch (err) {
          console.error('Error updating task:', err)
        }
      }

      // Also call the onUpdate callback
      onUpdate(task.id, {
        content: title,
        description,
        priority,
        due: dueDate || undefined,
        project_id: projectId || undefined,
        labels,
        estimated_minutes: estimatedMinutes
      })
    }, 800)

    return () => clearTimeout(timeout)
  }, [title, description, priority, dueDate, projectId, labels, estimatedMinutes, task, onUpdate])

  /* =======================
     TIMER / POMODORO SYNC
  ======================= */
  useEffect(() => {
    const syncTimer = () => {
      if (!task?.id) {
        setTimerInfo({
          isActive: false,
          isForThisTask: false,
          elapsedSeconds: 0
        })
        return
      }

      const activeTimer = getActiveTimer()
      if (activeTimer.taskId === task.id && activeTimer.isActive) {
        try {
          const raw = localStorage.getItem('taskTimer')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (!isStoredTimerState(parsed)) throw new Error('Invalid timer payload structure')
            const isRunning = Boolean(parsed.isRunning)
            const isPaused = Boolean(parsed.isPaused)
            const startTs = Number(parsed.startTime)
            const storedElapsed = Number(parsed.elapsedSeconds)
            const elapsed =
              isRunning && Number.isFinite(startTs) && startTs > 0
                ? Math.max(0, Math.floor((Date.now() - startTs) / 1000))
                : Number.isFinite(storedElapsed)
                ? storedElapsed
                : 0
            setTimerInfo({
              isActive: isRunning || isPaused,
              isForThisTask: true,
              elapsedSeconds: elapsed
            })
            return
          }
        } catch (err) {
          console.error('Error reading timer state', err)
        }
      }

      try {
        const rawPomodoro = localStorage.getItem('pomodoroState')
        if (rawPomodoro) {
          const parsed = JSON.parse(rawPomodoro)
          if (!isStoredPomodoroState(parsed)) throw new Error('Invalid pomodoro payload structure')
          const isRunning = Boolean(parsed.isRunning)
          const phase = parsed.phase || 'work'
          const remainingSecondsRaw = Number(parsed.remainingSeconds)
          const safeRemaining = Number.isFinite(remainingSecondsRaw) ? remainingSecondsRaw : 0

          if (parsed.taskId === task.id && isRunning) {
            const phaseDuration =
              phase === 'work'
                ? POMODORO_WORK_DURATION
                : phase === 'shortBreak'
                ? POMODORO_SHORT_BREAK_DURATION
                : POMODORO_LONG_BREAK_DURATION

            setTimerInfo({
              isActive: true,
              isForThisTask: true,
              elapsedSeconds: phaseDuration - safeRemaining,
              isPomodoro: true,
              pomodoroPhase: phase,
              pomodoroRemaining: safeRemaining
            })
            return
          }
        }
      } catch (err) {
        console.error('Error reading pomodoro state', err)
      }

      setTimerInfo({
        isActive: false,
        isForThisTask: false,
        elapsedSeconds: 0
      })
    }

    syncTimer()
    window.addEventListener('timerStateChanged', syncTimer)
    window.addEventListener('storage', syncTimer)
    return () => {
      window.removeEventListener('timerStateChanged', syncTimer)
      window.removeEventListener('storage', syncTimer)
    }
  }, [task?.id, getActiveTimer])

  if (!task) return null

  /* =======================
     ACTION HANDLERS
  ======================= */

  const generateSubtaskId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const values = crypto.getRandomValues(new Uint32Array(4))
      return `tmp-${Array.from(values)
        .map(n => n.toString(16))
        .join('-')}`
    }
    return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
      .toString(16)
      .slice(2)}`
  }

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return
    const content = newSubtask.trim()
    setNewSubtask('')

    const optimistic: SubtaskItem = {
      id: generateSubtaskId(),
      parentId: task.id,
      content,
      completed: false
    }
    setSubtasks(prev => [optimistic, ...prev])

    try {
      const res = await fetch('/api/todoist/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: task.id, content })
      })
      if (res.ok) {
        const data = await res.json()
        const saved = normalizeSubtasks([data.subtask], task.id)[0]
        setSubtasks(prev => [saved, ...prev.filter(st => st.id !== optimistic.id)])
        return
      }
    } catch (err) {
      console.error('Error creating subtask', err)
    }

    const local = addSubtaskLocal(task.id, content)
    if (local) {
      setSubtasks(prev => [local, ...prev.filter(st => st.id !== optimistic.id)])
    }
  }

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    setSubtasks(prev => prev.map(st => (st.id === subtaskId ? { ...st, completed } : st)))
    try {
      await fetch('/api/todoist/subtasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: task.id, subtaskId, patch: { completed } })
      })
    } catch (err) {
      console.error('Error updating subtask', err)
    }
    updateSubtaskLocal(task.id, subtaskId, { completed })
  }

  const handleCreateSubtasks = async (aiSubtasks: Array<{ content: string; description?: string; duration?: number }>) => {
    if (!aiSubtasks || aiSubtasks.length === 0) return
    try {
      const token = localStorage.getItem('todoist_token')
      if (!token) {
        showToast('Brak tokenu Todoist - zaloguj się, żeby tworzyć podzadania', 'error')
        return
      }

      await Promise.all(
        aiSubtasks.map(sub =>
          fetch('/api/todoist/tasks/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              content: sub.content,
              description: sub.description,
              project_id: task.project_id,
              parent_id: task.id,
              duration: sub.duration
            })
          })
        )
      )

      showToast(`Utworzono ${aiSubtasks.length} podzadań`, 'success')
      const res = await fetch(`/api/todoist/subtasks?parentId=${task.id}`)
      if (res.ok) {
        const data = await res.json()
        setSubtasks(prev =>
          mergeSubtasks(normalizeSubtasks(data.subtasks || [], task.id), prev)
        )
      }
    } catch (err) {
      console.error('Error creating subtasks via AI', err)
      showToast('Nie udało się utworzyć podzadań', 'error')
    }
  }

  const handleClarify = async () => {
    const clarification = prompt('Napisz, co chcesz doprecyzować w tym zadaniu:')
    if (clarification && task) {
      await fetchAIUnderstanding(task, true, clarification)
    }
  }

  const handleAISuggestions = async () => {
    if (!task || !title) return

    setLoadingAISuggestions(true)
    try {
      const token = localStorage.getItem('todoist_token')
      const userId = localStorage.getItem('todoist_user_id')

      const res = await fetch('/api/ai/suggest-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          userId,
          userContext: {
            projects: projects,
            recentTasks: []
          }
        })
      })

      if (res.ok) {
        const suggestions = await res.json()
        
        // Apply suggestions
        if (suggestions.priority) setPriority(suggestions.priority)
        if (suggestions.estimatedMinutes) setEstimatedMinutes(suggestions.estimatedMinutes)
        if (suggestions.suggestedDueDate) setDueDate(suggestions.suggestedDueDate)
        if (suggestions.suggestedLabels) setLabels(prev => [...new Set([...prev, ...suggestions.suggestedLabels])])
        
        // Find project by name
        if (suggestions.suggestedProject) {
          const matchingProject = projects.find(p => p.name === suggestions.suggestedProject)
          if (matchingProject) {
            setProjectId(matchingProject.id)
            setProjectName(matchingProject.name)
          }
        }

        showToast(suggestions.reasoning || 'AI zasugerowało właściwości zadania', 'success')
      }
    } catch (err) {
      console.error('Error fetching AI suggestions:', err)
      showToast('Nie udało się pobrać sugestii AI', 'error')
    } finally {
      setLoadingAISuggestions(false)
    }
  }

  const isTimerActiveForTask = timerInfo.isActive && timerInfo.isForThisTask

  const completedSubtasksCount = subtasks.filter(s => s.completed).length
  const totalSubtasksCount = subtasks.length

  const totalTimeWorked = task.duration || timerInfo.elapsedSeconds

  // Get timer sessions for this task
  const getTimerSessions = () => {
    try {
      const sessions = JSON.parse(localStorage.getItem('timerSessions') || '[]')
      return sessions.filter((s: any) => s.taskId === task.id)
    } catch {
      return []
    }
  }

  // Get pomodoro sessions for this task
  const getPomodoroSessions = () => {
    try {
      const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '[]')
      return sessions.filter((s: any) => s.taskId === task.id)
    } catch {
      return []
    }
  }

  /* =======================
     RENDER
  ======================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b bg-gradient-to-br from-purple-50 via-white to-pink-50 shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-lg">
                <Sparkle size={16} weight="fill" />
                <span className="hidden sm:inline">Task Cockpit Pro</span>
                <span className="sm:hidden">Cockpit</span>
              </Badge>
              <div className="flex gap-1 md:gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => fetchAIUnderstanding(task, true)} 
                  title="Odśwież opis AI"
                  className="hidden sm:flex"
                >
                  <ArrowClockwise size={16} />
                  <span className="hidden lg:inline">AI</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowPomodoro(true)} 
                  title="Pomodoro"
                  className="hidden sm:flex"
                >
                  <Lightning size={16} />
                  <span className="hidden lg:inline">Pomodoro</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onDelete(task.id)} 
                  title="Usuń"
                >
                  <Trash size={16} />
                  <span className="hidden lg:inline">Usuń</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onComplete(task.id)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                  title="Ukończ"
                >
                  <CheckCircle size={18} />
                  <span className="hidden lg:inline">Ukończ</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {/* Title and Metadata */}
          <div className="space-y-3 mb-4">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-xl md:text-2xl lg:text-3xl font-bold border-0 border-b-2 border-gray-200 focus:border-purple-500 rounded-none px-0"
              placeholder="Tytuł zadania"
              aria-label="Tytuł zadania"
              aria-describedby="ai-understanding-panel"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs md:text-sm flex-1">
                {dueDate && (
                  <Badge variant="outline" className="gap-1">
                    <CalendarBlank size={14} />
                    <span className="hidden sm:inline">{formatDateSafely(dueDate)}</span>
                    <span className="sm:hidden">{format(parseISO(dueDate), 'dd MMM', { locale: pl })}</span>
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1">
                  <Flag size={14} /> P{priority}
                </Badge>
                {projectName && (
                  <Badge variant="outline" className="gap-1">
                    <FolderOpen size={14} />
                    <span className="max-w-[100px] md:max-w-none truncate">
                      {projectName}
                    </span>
                  </Badge>
                )}
                {labels.map(label => (
                  <Badge key={label} className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200">
                    <Tag size={12} />
                    {label}
                  </Badge>
                ))}
                {estimatedMinutes > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Clock size={14} />
                    {estimatedMinutes}min
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleAISuggestions}
                disabled={loadingAISuggestions || !title}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shrink-0"
              >
                <Sparkle size={14} weight="fill" />
                <span className="hidden sm:inline">Sugestie AI</span>
              </Button>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* AI Understanding Section */}
              <Card className="p-4 md:p-6 bg-gradient-to-br from-purple-50 via-white to-pink-50 border-purple-200 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 text-purple-800">
                    <Brain size={24} weight="fill" />
                    <span className="font-bold text-base md:text-lg">Jak AI rozumie to zadanie</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleClarify} 
                      disabled={loadingAI}
                      className="border-purple-300 hover:bg-purple-100 text-purple-700"
                    >
                      <Sparkle size={14} />
                      <span className="hidden sm:inline">Doprecyzuj</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setShowChat(true)} 
                      disabled={loadingAI}
                      className="border-purple-300 hover:bg-purple-100 text-purple-700"
                    >
                      <ChatCircle size={14} />
                      <span className="hidden sm:inline">Rozmowa</span>
                    </Button>
                  </div>
                </div>
                <div
                  id="ai-understanding-panel"
                  className="rounded-xl bg-white/90 border-2 border-purple-200 p-4 text-sm md:text-base text-purple-900 min-h-[100px] shadow-inner"
                >
                  {loadingAI ? (
                    <div className="flex items-center gap-2 text-purple-600">
                      <ArrowClockwise size={16} className="animate-spin" />
                      Analizuję zadanie…
                    </div>
                  ) : aiUnderstanding ? (
                    <p className="leading-relaxed">{aiUnderstanding}</p>
                  ) : (
                    <p className="text-purple-600 italic">AI przygotowuje interpretację zadania...</p>
                  )}
                </div>
              </Card>

              {/* Description Section */}
              <Card className="p-4 md:p-6 space-y-3 shadow-lg border-gray-200">
                <div className="flex items-center gap-2 font-bold text-base md:text-lg text-gray-800">
                  <Clock size={20} weight="bold" /> Opis zadania
                </div>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Dodaj szczegółowy kontekst, linki, checklistę lub notatki…"
                  rows={6}
                  className="resize-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
                />
              </Card>

              {/* Subtasks Section */}
              <Card className="p-4 md:p-6 space-y-3 shadow-lg border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-bold text-base md:text-lg text-gray-800">
                    <ListChecks size={20} weight="bold" />
                    Podzadania
                    <Badge 
                      variant="secondary" 
                      className="ml-2 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800"
                    >
                      {completedSubtasksCount}/{totalSubtasksCount}
                    </Badge>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowBreakdown(true)}
                    className="border-purple-300 hover:bg-purple-50 text-purple-700"
                  >
                    <Brain size={14} />
                    <span className="hidden sm:inline">Wygeneruj AI</span>
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Dodaj nowe podzadanie..."
                    className="flex-1 text-sm md:text-base"
                  />
                  <Button 
                    onClick={handleAddSubtask} 
                    disabled={subtasksLoading || !newSubtask.trim()}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Dodaj</span>
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {subtasksLoading && (
                    <div className="flex items-center gap-2 text-gray-500 py-4">
                      <ArrowClockwise size={16} className="animate-spin" />
                      Ładuję podzadania…
                    </div>
                  )}
                  {!subtasksLoading && subtasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <ListChecks size={32} weight="light" className="mx-auto mb-2" />
                      <p className="text-sm">Brak podzadań — dodaj własne lub wygeneruj z AI</p>
                    </div>
                  )}
                  {subtasks.map(subtask => (
                    <label
                      key={subtask.id}
                      className="flex items-start gap-3 rounded-lg border-2 border-gray-200 p-3 hover:border-purple-300 hover:bg-purple-50/30 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 rounded text-purple-600 focus:ring-2 focus:ring-purple-500"
                        checked={Boolean(subtask.completed)}
                        onChange={e => handleToggleSubtask(subtask.id, e.target.checked)}
                      />
                      <span
                        className={`text-sm md:text-base leading-tight flex-1 ${
                          subtask.completed ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {subtask.content}
                      </span>
                    </label>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column - Metadata & Tracking */}
            <div className="lg:col-span-1 space-y-4">
              {/* Timer & Pomodoro */}
              <Card className="p-4 md:p-6 shadow-lg border-gray-200 bg-gradient-to-br from-blue-50 to-cyan-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 font-bold text-base md:text-lg">
                    <Timer size={20} weight="bold" /> Mierzenie czasu
                  </div>
                  <Badge 
                    variant={isTimerActiveForTask ? 'default' : 'outline'} 
                    className={isTimerActiveForTask ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : ''}
                  >
                    {isTimerActiveForTask ? (timerInfo.isPomodoro ? '🍅' : '⏱️') : '⏸️'}
                  </Badge>
                </div>
                
                {/* Timer Display */}
                <div className="bg-white rounded-xl p-4 mb-4 shadow-inner border-2 border-blue-200">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                      {isTimerActiveForTask ? (timerInfo.isPomodoro ? 'Pomodoro Aktywne' : 'Timer Aktywny') : 'Czas pracy'}
                    </p>
                    <p className="text-3xl md:text-4xl font-bold text-gray-900 font-mono mb-1">
                      {formatStopwatch(totalTimeWorked)}
                    </p>
                    {timerInfo.isPomodoro && timerInfo.pomodoroPhase && (
                      <p className="text-xs text-gray-600">
                        {timerInfo.pomodoroPhase === 'work' ? '🎯 Praca' : 
                         timerInfo.pomodoroPhase === 'shortBreak' ? '☕ Krótka przerwa' : 
                         '🌴 Długa przerwa'}
                        {timerInfo.pomodoroRemaining !== undefined && 
                          ` · ${formatStopwatch(timerInfo.pomodoroRemaining)} pozostało`
                        }
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Timer Controls */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button
                    size="sm"
                    variant={isTimerActiveForTask && !timerInfo.isPomodoro ? 'outline' : 'default'}
                    onClick={() => startTimer(task.id, title || task.content)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    <Play size={16} weight="fill" /> Start
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => stopTimer()}
                    disabled={!isTimerActiveForTask}
                  >
                    <Stop size={16} weight="fill" /> Stop
                  </Button>
                </div>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowPomodoro(true)}
                  className="w-full border-blue-300 hover:bg-blue-100 text-blue-700 mb-3"
                >
                  <Lightning size={14} weight="fill" /> Uruchom Pomodoro
                </Button>

                {/* Time Tracking History - Collapsible */}
                <div className="border-t-2 border-blue-200 pt-3">
                  <button
                    onClick={() => setTimeTrackingExpanded(!timeTrackingExpanded)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-blue-800 hover:text-blue-900 transition-colors"
                  >
                    <span>Śledzenie czasu</span>
                    {timeTrackingExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                  </button>

                  {timeTrackingExpanded && (
                    <div className="mt-3 space-y-3">
                      {/* Tabs */}
                      <div className="flex gap-2 border-b border-blue-200">
                        <button
                          onClick={() => setActiveTimeTab('manual')}
                          className={`px-3 py-2 text-xs font-medium transition-colors ${
                            activeTimeTab === 'manual'
                              ? 'border-b-2 border-blue-600 text-blue-800'
                              : 'text-gray-600 hover:text-blue-700'
                          }`}
                        >
                          Manualny
                        </button>
                        <button
                          onClick={() => setActiveTimeTab('pomodoro')}
                          className={`px-3 py-2 text-xs font-medium transition-colors ${
                            activeTimeTab === 'pomodoro'
                              ? 'border-b-2 border-blue-600 text-blue-800'
                              : 'text-gray-600 hover:text-blue-700'
                          }`}
                        >
                          Pomodoro
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="bg-white rounded-lg p-3 max-h-48 overflow-y-auto">
                        {activeTimeTab === 'manual' ? (
                          <div className="space-y-2">
                            {getTimerSessions().length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-4">
                                Brak sesji manualnych
                              </p>
                            ) : (
                              getTimerSessions().map((session: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs border-b border-gray-100 pb-2"
                                >
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {formatStopwatch(session.durationSeconds)}
                                    </p>
                                    <p className="text-gray-500">
                                      {format(parseISO(session.startTime), 'dd MMM HH:mm', { locale: pl })}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {getPomodoroSessions().length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-4">
                                Brak sesji pomodoro
                              </p>
                            ) : (
                              getPomodoroSessions().map((session: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs border-b border-gray-100 pb-2"
                                >
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      🍅 {formatStopwatch(session.durationSeconds)}
                                    </p>
                                    <p className="text-gray-500">
                                      {format(parseISO(session.startTime), 'dd MMM HH:mm', { locale: pl })}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Properties */}
              <Card className="p-4 md:p-6 shadow-lg border-gray-200">
                <div className="flex items-center gap-2 font-bold text-base md:text-lg mb-4">
                  <Flag size={20} weight="bold" /> Właściwości
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-1 font-medium">
                      <CalendarBlank size={12} /> Termin
                    </p>
                    <Input 
                      type="date" 
                      value={dueDate} 
                      onChange={e => setDueDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-1 font-medium">
                      <Flag size={12} /> Priorytet
                    </p>
                    <Select
                      value={String(priority)}
                      onChange={e => {
                        const next = Number(e.target.value)
                        if ([1, 2, 3, 4].includes(next)) {
                          setPriority(next as 1 | 2 | 3 | 4)
                        }
                      }}
                      className="text-sm"
                    >
                      <SelectOption value="1">P1 - 🔴 Krytyczne</SelectOption>
                      <SelectOption value="2">P2 - 🟠 Wysokie</SelectOption>
                      <SelectOption value="3">P3 - 🟡 Normalne</SelectOption>
                      <SelectOption value="4">P4 - 🔵 Niskie</SelectOption>
                    </Select>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-1 font-medium">
                      <FolderOpen size={12} /> Projekt
                    </p>
                    <Select
                      value={projectId}
                      onChange={e => {
                        const selectedProject = projects.find(p => p.id === e.target.value)
                        setProjectId(e.target.value)
                        setProjectName(selectedProject?.name || '')
                      }}
                      className="text-sm"
                    >
                      <SelectOption value="">Brak projektu</SelectOption>
                      {projects.map(project => (
                        <SelectOption key={project.id} value={project.id}>
                          {project.name}
                        </SelectOption>
                      ))}
                    </Select>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-1 font-medium">
                      <Tag size={12} /> Etykiety
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {labels.map(label => (
                        <Badge 
                          key={label} 
                          variant="outline" 
                          className="text-xs border-purple-200 bg-purple-50 text-purple-700 flex items-center gap-1 cursor-pointer hover:bg-purple-100"
                          onClick={() => handleRemoveLabel(label)}
                        >
                          {label}
                          <X size={12} />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddLabel()}
                        placeholder="Nowa etykieta..."
                        className="text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddLabel}
                        disabled={!newLabel.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-1 font-medium">
                      <Clock size={12} /> Estymowany czas (minuty)
                    </p>
                    <Input
                      type="number"
                      value={estimatedMinutes || ''}
                      onChange={e => setEstimatedMinutes(Number(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      className="text-sm"
                    />
                  </div>
                </div>
              </Card>

              {/* Change History */}
              <Card className="p-4 md:p-6 shadow-lg border-gray-200">
                <div className="flex items-center gap-2 font-bold text-base md:text-lg mb-3">
                  <ClockClockwise size={20} weight="bold" /> Historia zmian
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {changeHistory.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <ClockClockwise size={28} weight="light" className="mx-auto mb-2" />
                      <p className="text-xs">Brak historii zmian</p>
                    </div>
                  ) : (
                    changeHistory.map((change, idx) => (
                      <div 
                        key={idx}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-700">{change.field}</span>
                          <span className="text-gray-500">
                            {format(parseISO(change.timestamp), 'HH:mm', { locale: pl })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="line-through text-red-600 truncate max-w-[100px]">
                            {change.oldValue}
                          </span>
                          →
                          <span className="text-green-600 truncate max-w-[100px]">
                            {change.newValue}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Additional Modals */}
      <PomodoroTimer
        open={showPomodoro}
        onOpenChange={setShowPomodoro}
        taskId={task.id}
        taskTitle={title || task.content}
      />

      {showBreakdown && (
        <AITaskBreakdownModal
          open={showBreakdown}
          onClose={() => setShowBreakdown(false)}
          task={task}
          onCreateSubtasks={handleCreateSubtasks}
        />
      )}

      {showChat && (
        <TaskChatModal
          open={showChat}
          onClose={() => setShowChat(false)}
          task={task}
        />
      )}
    </Dialog>
  )
}
