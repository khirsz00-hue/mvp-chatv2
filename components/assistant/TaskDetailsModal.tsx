'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import Separator from '@/components/ui/Separator'
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
  Stop
} from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useTaskTimer } from './TaskTimer'
import { AITaskBreakdownModal } from './AITaskBreakdownModal'

/* =======================
   TYPES
======================= */

interface Task {
  id: string
  content: string
  description?: string
  project_id?: string
  priority: 1 | 2 | 3 | 4
  due?: { date: string } | string
  created_at?: string
  duration?: number
  labels?: string[]
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
  const [showTimer, setShowTimer] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const [aiUnderstanding, setAiUnderstanding] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const fetchedTaskIdRef = useRef<string | null>(null)

  const { startTimer, stopTimer, getActiveTimer } = useTaskTimer()

  /* =======================
     AI UNDERSTANDING
  ======================= */

  const fetchAIUnderstanding = useCallback(async (task: Task) => {
    // Prevent duplicate fetches for the same task
    if (!task || !task.id || fetchedTaskIdRef.current === task.id) return

    fetchedTaskIdRef.current = task.id
    setLoadingAI(true)

    const prompt = `
Zadanie: ${task.content}
Opis: ${task.description || ''}

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
      // Reset state when modal closes
      setAiUnderstanding('')
      fetchedTaskIdRef.current = null
      return
    }

    setTitle(task.content || '')
    setDescription(task.description || '')
    setDueDate(typeof task.due === 'string' ? task.due : task.due?.date || '')
    setPriority(task.priority)

    // Reset AI understanding only if it's a different task
    if (fetchedTaskIdRef.current !== task.id) {
      setAiUnderstanding('')
      fetchAIUnderstanding(task)
    }

  }, [task, fetchAIUnderstanding])

  /* =======================
     AUTO SAVE
  ======================= */

  useEffect(() => {
    if (!task?.id || !onUpdate) return

    // Skip auto-save on initial load (when values match task)
    if (
      title === (task.content || '') &&
      description === (task.description || '') &&
      priority === task.priority &&
      dueDate === (typeof task.due === 'string' ? task.due : task.due?.date || '')
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

  if (!task) return null

  /* =======================
     RENDER
  ======================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto space-y-6">

        {/* TITLE */}
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-2xl font-semibold"
          placeholder="Tytuł zadania"
        />

        {/* META */}
        <div className="flex gap-2 flex-wrap">
          {dueDate && (
            <Badge variant="outline">
              <CalendarBlank size={14} />
              {(() => {
                try {
                  return format(parseISO(dueDate), 'dd MMM yyyy', { locale: pl })
                } catch {
                  return dueDate
                }
              })()}
            </Badge>
          )}
          <Badge variant="secondary">
            <Flag size={14} /> P{priority}
          </Badge>
        </div>

        <Separator />

        {/* AI UNDERSTANDING */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Brain size={20} className="text-purple-600" />
            {loadingAI ? (
              <span className="text-sm">Analizuję zadanie…</span>
            ) : (
              <p className="text-sm text-purple-800">{aiUnderstanding}</p>
            )}
          </div>
        </div>

        {/* DESCRIPTION */}
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Opis zadania"
          rows={4}
        />

        {/* TIME TRACKING (collapsed by default) */}
        <div className="border rounded-lg">
          <button
            onClick={() => setShowTimer(!showTimer)}
            className="w-full flex justify-between p-3 text-sm"
          >
            <span className="flex gap-2 items-center">
              <Timer size={16} /> Śledzenie czasu
            </span>
            {showTimer ? '▼' : '▶'}
          </button>

          {showTimer && (
            <div className="p-3">
              <Button onClick={() => startTimer(task.id, task.content)}>
                Start
              </Button>
              <Button variant="outline" onClick={stopTimer}>
                Stop
              </Button>
            </div>
          )}
        </div>

        {/* HISTORY */}
        <div className="border rounded-lg">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex justify-between p-3 text-sm"
          >
            <span className="flex gap-2 items-center">
              <CalendarBlank size={16} /> Historia zmian
            </span>
            {showHistory ? '▼' : '▶'}
          </button>

          {showHistory && (
            <div className="p-3 text-xs text-gray-500">
              (kolejne zmiany terminów / priorytetów będą tu zapisywane)
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="destructive"
            onClick={() => onDelete(task.id)}
          >
            <Trash size={16} />
          </Button>

          <div className="flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Zamknij
            </button>

            <Button
              onClick={() => onComplete(task.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={18} /> Ukończ
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
