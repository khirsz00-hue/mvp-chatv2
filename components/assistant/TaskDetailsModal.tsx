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
  ListChecks
} from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useTaskTimer } from './TaskTimer'
import { AITaskBreakdownModal } from './AITaskBreakdownModal'
import { PomodoroTimer } from './PomodoroTimer'
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

const normalizeSubtasks = (
  items: RawSubtask[] = [],
  parentId?: string
) =>
  items
    .filter(Boolean)
    .map((s: RawSubtask) => {
      const fallbackTitle =
        'title' in s && typeof (s as MinimalSubtaskShape).title === 'string'
          ? (s as MinimalSubtaskShape).title
          : ''
      const mainContent = typeof s.content === 'string' ? s.content : ''
      return {
        id: String(s.id ?? '').trim(),
        parentId: s.parentId || parentId,
        content: (mainContent || fallbackTitle).toString(),
        createdAt: s.createdAt,
        completed: Boolean(s.completed)
      }
    })
    .filter(s => s.id !== '' && s.content.trim() !== '')

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

  const [aiUnderstanding, setAiUnderstanding] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const fetchedTaskIdRef = useRef<string | null>(null)

  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([])
  const [subtasksLoading, setSubtasksLoading] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
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
     AI UNDERSTANDING
  ======================= */

  const fetchAIUnderstanding = useCallback(async (currentTask: Task, force = false) => {
    if (!currentTask || !currentTask.id || (!force && fetchedTaskIdRef.current === currentTask.id)) return

    fetchedTaskIdRef.current = currentTask.id
    setLoadingAI(true)

    const prompt = `
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
  }, [])

  /* =======================
     INIT TASK
  ======================= */

  useEffect(() => {
    if (!task?.id) {
      setAiUnderstanding('')
      setSubtasks([])
      fetchedTaskIdRef.current = null
      return
    }

    setTitle(task.content || '')
    setDescription(task.description || '')
    setDueDate(parseDueDate(task.due))
    setPriority(task.priority)

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
     AUTO SAVE
  ======================= */

  useEffect(() => {
    if (!task?.id || !onUpdate) return

    if (
      title === (task.content || '') &&
      description === (task.description || '') &&
      priority === task.priority &&
      dueDate === parseDueDate(task.due)
    ) {
      return
    }

    const timeout = setTimeout(() => {
      onUpdate(task.id, {
        content: title,
        description,
        priority,
        due: dueDate || undefined
      })
    }, 800)

    return () => clearTimeout(timeout)
  }, [title, description, priority, dueDate, task, onUpdate])

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
            if (!parsed || typeof parsed !== 'object') throw new Error('Invalid timer payload')
            const isRunning = Boolean((parsed as any).isRunning)
            const isPaused = Boolean((parsed as any).isPaused)
            const startTs = Number((parsed as any).startTime)
            const storedElapsed = Number((parsed as any).elapsedSeconds)
            const elapsed =
              isRunning && Number.isFinite(startTs) && startTs > 0
                ? Math.floor((Date.now() - startTs) / 1000)
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
          if (!parsed || typeof parsed !== 'object') throw new Error('Invalid pomodoro payload')
          const isRunning = Boolean((parsed as any).isRunning)
          const phase = (parsed as any).phase as 'work' | 'shortBreak' | 'longBreak' | undefined
          const remainingSecondsRaw = Number((parsed as any).remainingSeconds)
          const safeRemaining = Number.isFinite(remainingSecondsRaw) ? remainingSecondsRaw : 0

          if ((parsed as any).taskId === task.id && isRunning) {
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

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return
    const content = newSubtask.trim()
    setNewSubtask('')

    const optimistic: SubtaskItem = {
      id: `tmp-${Date.now()}`,
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
        showToast('Brak tokenu Todoist - zaloguj się aby tworzyć podzadania', 'error')
        return
      }

      for (const sub of aiSubtasks) {
        await fetch('/api/todoist/tasks/add', {
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
      }

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

  const isTimerActiveForTask = timerInfo.isActive && timerInfo.isForThisTask

  const completedSubtasksCount = subtasks.filter(s => s.completed).length
  const totalSubtasksCount = subtasks.length

  /* =======================
     RENDER
  ======================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              <Sparkle size={16} weight="fill" />
              Task cockpit
            </Badge>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => fetchAIUnderstanding(task, true)} title="Odśwież opis AI">
                <ArrowClockwise size={16} />
                AI
              </Button>
              <Button variant="ghost" onClick={() => setShowPomodoro(true)} title="Pomodoro dla tego zadania">
                <Lightning size={16} />
                Pomodoro
              </Button>
              <Button variant="destructive" onClick={() => onDelete(task.id)} title="Usuń zadanie">
                <Trash size={16} />
              </Button>
              <Button
                onClick={() => onComplete(task.id)}
                className="bg-green-600 hover:bg-green-700"
                title="Oznacz jako ukończone"
              >
                <CheckCircle size={18} /> Ukończ
              </Button>
            </div>
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">Szczegóły zadania</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mb-4">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-3xl font-semibold"
            placeholder="Tytuł zadania"
            aria-label="Tytuł zadania"
          />
          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
            {dueDate && (
              <Badge variant="outline" className="gap-1">
                <CalendarBlank size={14} />
                {formatDateSafely(dueDate)}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1">
              <Flag size={14} /> Priorytet P{priority}
            </Badge>
            {task.project_id && (
              <Badge variant="outline" className="gap-1">
                <FolderOpen size={14} />
                {task.project_name || task.project_id}
              </Badge>
            )}
            {(task.labels || []).map(label => (
              <Badge key={label} className="bg-slate-100 text-slate-700 border border-slate-200">
                <Tag size={12} />
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
          <div className="space-y-4">
            <Card className="p-4 md:p-5 bg-gradient-to-br from-purple-50 via-white to-pink-50 border-purple-100/60 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-purple-800">
                  <Brain size={20} weight="fill" />
                  <span className="font-semibold">Jak AI rozumie to zadanie</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => fetchAIUnderstanding(task, true)} disabled={loadingAI}>
                  <Sparkle size={14} />
                  Odśwież
                </Button>
              </div>
              <div className="rounded-xl bg-white/80 border border-purple-100 p-4 text-sm text-purple-900 min-h-[96px]">
                {loadingAI ? 'Analizuję zadanie…' : aiUnderstanding || 'AI przygotowuje interpretację zadania.'}
              </div>
            </Card>

            <Card className="p-4 md:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Clock size={18} /> Opis
                </div>
              </div>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Dodaj kontekst, linki, checklistę…"
                rows={6}
              />
            </Card>

            <Card className="p-4 md:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <ListChecks size={18} weight="bold" />
                  Subtaski
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowBreakdown(true)}>
                    <Brain size={14} />
                    Wygeneruj AI
                  </Button>
                  <Badge variant="secondary">
                    {totalSubtasksCount ? `${completedSubtasksCount}/${totalSubtasksCount}` : '0/0'} ukończone
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  placeholder="Nowy subtask"
                />
                <Button onClick={handleAddSubtask} disabled={subtasksLoading}>
                  <Plus size={16} />
                  Dodaj
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {subtasksLoading && <p className="text-sm text-gray-500">Ładuję podzadania…</p>}
                {!subtasksLoading && subtasks.length === 0 && (
                  <p className="text-sm text-gray-500">Brak podzadań — dodaj własne lub wygeneruj z AI.</p>
                )}
                {subtasks.map(subtask => (
                  <label
                    key={subtask.id}
                    className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 hover:border-purple-200 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 text-purple-600"
                      checked={Boolean(subtask.completed)}
                      onChange={e => handleToggleSubtask(subtask.id, e.target.checked)}
                    />
                    <span
                      className={`text-sm leading-tight ${
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

          <div className="space-y-4">
            <Card className="p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Timer size={18} /> Timer &amp; Pomodoro
                </div>
                <Badge variant={isTimerActiveForTask ? 'secondary' : 'outline'} className="gap-1">
                  {timerInfo.isPomodoro ? 'Pomodoro' : 'Timer'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {isTimerActiveForTask ? (timerInfo.isPomodoro ? 'Pomodoro aktywne' : 'Timer aktywny') : 'Nieaktywne'}
                  </p>
                  {timerInfo.isPomodoro && timerInfo.pomodoroRemaining !== undefined ? (
                    <p className="text-sm text-gray-500">
                      Faza: {timerInfo.pomodoroPhase || '-'} · Pozostało {formatStopwatch(timerInfo.pomodoroRemaining || 0)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {isTimerActiveForTask ? `Czas: ${formatStopwatch(timerInfo.elapsedSeconds)}` : 'Brak odpalonego trackera'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={isTimerActiveForTask && !timerInfo.isPomodoro ? 'outline' : 'default'}
                    onClick={() => startTimer(task.id, title || task.content)}
                  >
                    <Play size={16} /> Start
                  </Button>
                  <Button variant="outline" onClick={() => stopTimer()}>
                    <Stop size={16} /> Stop
                  </Button>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <CalendarBlank size={12} /> Termin
                  </p>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
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
                  >
                    <SelectOption value="1">P1 - krytyczne</SelectOption>
                    <SelectOption value="2">P2 - wysokie</SelectOption>
                    <SelectOption value="3">P3 - normalne</SelectOption>
                    <SelectOption value="4">P4 - później</SelectOption>
                  </Select>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <FolderOpen size={12} /> Projekt
                  </p>
                  <div className="text-sm font-medium text-gray-800">
                    {task.project_name || task.project_id || 'Brak projektu'}
                  </div>
                </div>
                {task.labels && task.labels.length > 0 && (
                  <div className="sm:col-span-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <Tag size={12} /> Etykiety
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {task.labels.map(label => (
                        <Badge key={label} variant="outline" className="border-purple-200 text-purple-700">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <CalendarBlank size={16} /> Kontrola
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Zamknij
                  </Button>
                  <Button onClick={() => onComplete(task.id)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle size={18} /> Ukończ
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Zmieniaj daty, priorytet i odpalaj timery bez wychodzenia z modalki.
              </p>
            </Card>
          </div>
        </div>
      </DialogContent>

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
    </Dialog>
  )
}
