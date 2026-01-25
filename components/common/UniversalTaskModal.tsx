'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import { 
  Lightning, 
  Brain, 
  Calendar, 
  Tag, 
  FolderOpen,
  ListChecks,
  Timer,
  ClockClockwise,
  Sparkle,
  PencilSimple,
  CheckCircle,
  Play,
  Pause,
  Stop,
  Clock,
  CalendarBlank,
  Flag,
  Trash
} from '@phosphor-icons/react'
import { format, addDays } from 'date-fns'
import { CollapsibleSection } from './CollapsibleSection'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

/* =======================
   TYPES
======================= */

export interface TaskData {
  id?: string
  content: string
  description?: string
  estimated_minutes: number
  cognitive_load: number
  project_id?: string
  priority: 1 | 2 | 3 | 4
  due?: string
  labels?: string[]
}

interface UniversalTaskModalProps {
  // Core
  open: boolean
  onOpenChange: (open: boolean) => void
  
  // Data
  task?: TaskData | null
  defaultDate?: string
  
  // Handlers
  onSave: (taskData: TaskData) => void | Promise<void>
  onDelete?: (taskId: string) => void | Promise<void>
  onComplete?: (taskId: string) => void | Promise<void>
  
  // Optional overrides
  title?: string
  hideSubtasks?: boolean
  hideTimeTracking?: boolean
  hideHistory?: boolean
}

interface Project {
  id: string
  name: string
  color?: string
}

interface Label {
  id: string
  name: string
  color?: string
}

interface Subtask {
  id: string
  content: string
  completed: boolean
}

interface ChangeHistoryItem {
  id: string
  field: string
  oldValue: string
  newValue: string
  timestamp: string
}

interface TimerSession {
  id: string
  duration: number
  date: string
  sessionType?: string
}

/* =======================
   MAIN COMPONENT
======================= */

export function UniversalTaskModal({
  open,
  onOpenChange,
  task,
  defaultDate,
  onSave,
  onDelete,
  onComplete,
  title: customTitle,
  hideSubtasks = false,
  hideTimeTracking = false,
  hideHistory = false
}: UniversalTaskModalProps) {
  
  const isEditMode = Boolean(task?.id)
  const modalTitle = customTitle || (isEditMode ? 'Edytuj zadanie' : 'Dodaj nowe zadanie')
  
  // Form state
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(25)
  const [cognitiveLoad, setCognitiveLoad] = useState(3)
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(3)
  const [dueDate, setDueDate] = useState('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  
  // Data
  const [projects, setProjects] = useState<Project[]>([])
  const [availableLabels, setAvailableLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // AI Understanding
  const [aiUnderstanding, setAiUnderstanding] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [showClarifyModal, setShowClarifyModal] = useState(false)
  const [clarifyText, setClarifyText] = useState('')
  
  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  
  // Time tracking
  const [timeTab, setTimeTab] = useState<'manual' | 'pomodoro'>('manual')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSessions, setTimerSessions] = useState<TimerSession[]>([])
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break'>('work')
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pomodoroTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Change history
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([])
  const lastValuesRef = useRef({
    content: '',
    description: '',
    priority: 3 as 1 | 2 | 3 | 4,
    dueDate: ''
  })
  
  // Mobile tabs for advanced features
  const [activeTab, setActiveTab] = useState<'subtasks' | 'time' | 'history' | null>(null)
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  /* =======================
     EFFECTS
  ======================= */
  
  // Fetch projects and labels on mount
  useEffect(() => {
    if (!open) return
    
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch projects from Supabase auth session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const projectsRes = await fetch('/api/todoist/projects', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (projectsRes.ok) {
            const data = await projectsRes.json()
            console.log('📁 Loaded projects:', data)
            setProjects(data.projects || data || [])
          } else {
            console.error('Failed to fetch projects:', projectsRes.status, await projectsRes.text())
          }
        } else {
          console.warn('No session available for fetching projects')
        }
        
        // Fetch labels
        if (token) {
          const labelsRes = await fetch(`/api/todoist/labels?token=${token}`)
          if (labelsRes.ok) {
            const data = await labelsRes.json()
            setAvailableLabels(data.labels || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [open, token])
  
  // Load task data in edit mode
  useEffect(() => {
    if (open && task) {
      const initialContent = task.content || ''
      const initialDescription = task.description || ''
      const initialPriority = task.priority || 3
      const initialDueDate = task.due || defaultDate || ''
      
      setContent(initialContent)
      setDescription(initialDescription)
      setEstimatedMinutes(task.estimated_minutes || 25)
      setCognitiveLoad(task.cognitive_load || 3)
      setProjectId(task.project_id || '')
      setPriority(initialPriority)
      setDueDate(initialDueDate)
      setSelectedLabels(task.labels || [])
      
      // Initialize lastValuesRef
      lastValuesRef.current = {
        content: initialContent,
        description: initialDescription,
        priority: initialPriority,
        dueDate: initialDueDate
      }
    } else if (open) {
      // Reset form for create mode
      setContent('')
      setDescription('')
      setEstimatedMinutes(25)
      setCognitiveLoad(3)
      setProjectId('')
      setPriority(3)
      setDueDate(defaultDate || new Date().toISOString().split('T')[0])
      setSelectedLabels([])
      setNewLabel('')
      setAiUnderstanding('')
      setSubtasks([])
      setChangeHistory([])
      
      lastValuesRef.current = {
        content: '',
        description: '',
        priority: 3,
        dueDate: ''
      }
    }
  }, [open, task, defaultDate])
  
  // Auto-generate AI understanding when title changes
  useEffect(() => {
    if (!content.trim() || content.length < 5) {
      setAiUnderstanding('')
      return
    }
    
    const timeout = setTimeout(async () => {
      try {
        setLoadingAI(true)
        
        const prompt = `Zadanie: ${content}
${description ? `Opis: ${description}` : ''}

W 1-2 zwięzłych zdaniach wyjaśnij jak rozumiesz to zadanie. Bądź konkretny i pomocny.`
        
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }]
          })
        })
        
        if (!response.ok) {
          console.error('Failed to generate AI understanding:', response.status)
          setAiUnderstanding('')
          return
        }
        
        const data = await response.json()
        setAiUnderstanding(data.response || '')
      } catch (error) {
        console.error('Error generating AI understanding:', error)
        setAiUnderstanding('')
      } finally {
        setLoadingAI(false)
      }
    }, 2000) // Wait 2 seconds for user to finish typing
    
    return () => clearTimeout(timeout)
  }, [content, description])
  
  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTimerRunning])
  
  // Auto-stop Pomodoro at time limit
  // Note: Using inline setIsTimerRunning instead of stopPomodoro() to avoid
  // dependency order issues (stopPomodoro is defined later in the component)
  useEffect(() => {
    if (!isTimerRunning || timeTab !== 'pomodoro') return
    
    const limit = pomodoroPhase === 'work' ? 25 * 60 : 5 * 60
    if (elapsedSeconds >= limit) {
      // Stop inline to avoid dependency issue
      setIsTimerRunning(false)
    }
  }, [elapsedSeconds, isTimerRunning, timeTab, pomodoroPhase])
  
  // Cleanup Pomodoro timeout on unmount
  useEffect(() => {
    return () => {
      if (pomodoroTimeoutRef.current) {
        clearTimeout(pomodoroTimeoutRef.current)
      }
    }
  }, [])
  
  // Fetch timer sessions from database when task opens
  useEffect(() => {
    if (!open || !task?.id) return
    
    const fetchTimerSessions = async () => {
      try {
        const response = await fetch(`/api/tasks/${task.id}/time-sessions`)
        if (response.ok) {
          const data = await response.json()
          setTimerSessions(data.sessions || [])
        }
      } catch (error) {
        console.error('Failed to fetch timer sessions:', error)
      }
    }
    
    fetchTimerSessions()
  }, [open, task?.id])
  
  // Auto-save and change tracking for edit mode
  useEffect(() => {
    if (!task?.id || !isEditMode) return
    
    // Check if anything changed
    if (
      content === (task.content || '') &&
      description === (task.description || '') &&
      priority === (task.priority || 3) &&
      dueDate === (task.due || '') &&
      projectId === (task.project_id || '') &&
      JSON.stringify(selectedLabels) === JSON.stringify(task.labels || []) &&
      estimatedMinutes === (task.estimated_minutes || 25)
    ) {
      return
    }
    
    const timeout = setTimeout(() => {
      const now = new Date().toISOString()
      const changes: ChangeHistoryItem[] = []
      
      // Helper to generate unique IDs
      const generateId = (field: string) => {
        return crypto.randomUUID?.() || `change-${field}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      
      // Track changes
      if (content !== lastValuesRef.current.content && lastValuesRef.current.content !== '') {
        changes.push({
          id: generateId('content'),
          field: 'Tytuł',
          oldValue: lastValuesRef.current.content,
          newValue: content,
          timestamp: now
        })
      }
      
      if (description !== lastValuesRef.current.description && lastValuesRef.current.description !== '') {
        changes.push({
          id: generateId('description'),
          field: 'Opis',
          oldValue: lastValuesRef.current.description || '(pusty)',
          newValue: description || '(pusty)',
          timestamp: now
        })
      }
      
      if (priority !== lastValuesRef.current.priority) {
        changes.push({
          id: generateId('priority'),
          field: 'Priorytet',
          oldValue: `P${lastValuesRef.current.priority}`,
          newValue: `P${priority}`,
          timestamp: now
        })
      }
      
      if (dueDate !== lastValuesRef.current.dueDate && lastValuesRef.current.dueDate !== '') {
        changes.push({
          id: generateId('dueDate'),
          field: 'Termin',
          oldValue: lastValuesRef.current.dueDate || '(brak)',
          newValue: dueDate || '(brak)',
          timestamp: now
        })
      }
      
      if (changes.length > 0) {
        setChangeHistory(prev => [...changes, ...prev])
      }
      
      // Update lastValuesRef
      lastValuesRef.current = {
        content,
        description,
        priority,
        dueDate
      }
      
      // Auto-save via onSave callback
      onSave({
        ...(task.id && { id: task.id }),
        content,
        description,
        priority,
        due: dueDate || undefined,
        project_id: projectId || undefined,
        labels: selectedLabels,
        estimated_minutes: estimatedMinutes,
        cognitive_load: cognitiveLoad
      })
    }, 800)
    
    return () => clearTimeout(timeout)
  }, [content, description, priority, dueDate, projectId, selectedLabels, estimatedMinutes, cognitiveLoad, task, isEditMode, onSave])
  
  /* =======================
     HANDLERS
  ======================= */
  
  const handleClarify = () => {
    setShowClarifyModal(true)
  }
  
  const handleSubmitClarification = async () => {
    if (!clarifyText.trim()) return
    
    setLoadingAI(true)
    setShowClarifyModal(false)
    
    try {
      // Call AI to get updated understanding with clarification
      const prompt = `Poprzednia analiza: ${aiUnderstanding}

Zadanie: ${content}
Opis: ${description || ''}

Kontekst doprecyzowania: ${clarifyText}

Zaktualizuj swoją analizę zadania uwzględniając nowy kontekst. Odpowiedz w 1-2 zwięzłych zdaniach, jak rozumiesz to zadanie.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAiUnderstanding(data.response || '')
      }
    } catch (error) {
      console.error('Failed to clarify:', error)
    } finally {
      setLoadingAI(false)
      setClarifyText('')
    }
  }
  
  const handleGeneratePlan = async () => {
    if (!content.trim()) return
    
    setLoadingAI(true)
    try {
      // Call AI API to generate plan
      const prompt = `Zadanie: "${content}"
Opis: "${description || ''}"

Wygeneruj 4-7 konkretnych subtasków (podzadań) dla tego zadania w formacie JSON:
{
  "subtasks": [
    {"content": "Krok 1 - konkretna akcja", "description": "Szczegóły"}
  ]
}

Każdy subtask powinien być konkretny, wykonalny i logicznie uporządkowany.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Jesteś asystentem specjalizującym się w dekompozycji zadań.' },
            { role: 'user', content: prompt }
          ],
          jsonMode: true
        })
      })

      if (res.ok) {
        const data = await res.json()
        let parsed
        try {
          parsed = JSON.parse(data.response || '{}')
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError)
          setAiUnderstanding('Nie udało się przetworzyć odpowiedzi AI')
          return
        }
        
        if (parsed.subtasks && Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0) {
          // Add subtasks to the state
          const newSubtasks = parsed.subtasks.map((st: any) => ({
            id: crypto.randomUUID?.() || `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: st.content || st.title,
            completed: false
          }))
          
          setSubtasks([...subtasks, ...newSubtasks])
          setAiUnderstanding(`Plan wygenerowany - dodano ${newSubtasks.length} podzadań`)
        }
      }
    } catch (error) {
      console.error('Failed to generate plan:', error)
      setAiUnderstanding('Nie udało się wygenerować planu')
    } finally {
      setLoadingAI(false)
    }
  }
  
  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return
    
    const subtask: Subtask = {
      id: Date.now().toString(),
      content: newSubtask.trim(),
      completed: false
    }
    
    setSubtasks([...subtasks, subtask])
    setNewSubtask('')
  }
  
  const handleToggleSubtask = (id: string, completed: boolean) => {
    setSubtasks(subtasks.map(s => 
      s.id === id ? { ...s, completed } : s
    ))
  }
  
  const startTimer = () => {
    setIsTimerRunning(true)
  }
  
  const pauseTimer = () => {
    setIsTimerRunning(false)
  }
  
  const stopTimer = async () => {
    setIsTimerRunning(false)
    
    if (elapsedSeconds > 0 && task?.id) {
      try {
        // Save to database via supabase
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        
        const { data, error } = await supabase
          .from('time_sessions')
          .insert({
            user_id: user.id,
            task_id: task.id,
            task_source: 'day_assistant_v2',
            task_title: task.content,
            started_at: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: elapsedSeconds,
            session_type: 'manual'
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Add to local state for immediate display using functional update
        const session: TimerSession = {
          id: data.id,
          duration: Math.floor(elapsedSeconds / 60),
          date: new Date().toLocaleString('pl-PL'),
          sessionType: 'manual'
        }
        setTimerSessions(prev => [session, ...prev])
        
        toast.success(`✅ Zapisano sesję: ${session.duration} min`)
      } catch (error) {
        console.error('Failed to save timer session:', error)
        toast.error('Nie udało się zapisać sesji')
      }
    }
    
    setElapsedSeconds(0)
  }
  
  const startPomodoro = async () => {
    if (!task?.id) return
    
    try {
      // Set 25 minutes for work phase
      setElapsedSeconds(0)
      setPomodoroPhase('work')
      setTimeTab('pomodoro')
      setIsTimerRunning(true)
      
      // Save to database
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      await supabase
        .from('time_sessions')
        .insert({
          user_id: user.id,
          task_id: task.id,
          task_source: 'day_assistant_v2',
          task_title: task.content,
          started_at: new Date().toISOString(),
          session_type: 'pomodoro',
          metadata: { phase: 'work', count: pomodoroCount + 1 }
        })
      
      toast.success('🍅 Pomodoro rozpoczęty - 25 minut pracy!')
    } catch (error) {
      console.error('Failed to start pomodoro:', error)
      toast.error('Nie udało się uruchomić Pomodoro')
    }
  }
  
  const stopPomodoro = useCallback(async () => {
    setIsTimerRunning(false)
    
    if (elapsedSeconds > 0 && task?.id) {
      const minutes = Math.floor(elapsedSeconds / 60)
      const isComplete = elapsedSeconds >= 25 * 60  // 25 minutes
      
      if (isComplete) {
        setPomodoroCount(prev => prev + 1)
        
        // Switch to break
        if (pomodoroPhase === 'work') {
          setPomodoroPhase('break')
          setElapsedSeconds(0)
          toast.success('🎉 Pomodoro ukończone! Czas na przerwę (5 min)')
          // Auto-start 5 min break after 1 second delay to allow UI update
          pomodoroTimeoutRef.current = setTimeout(() => {
            setElapsedSeconds(0)
            setIsTimerRunning(true)
          }, 1000)
        } else {
          // Break complete
          setPomodoroPhase('work')
          toast.success('✅ Przerwa zakończona! Gotowy na kolejne Pomodoro?')
        }
      }
      
      // Save to database
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        
        const { data, error } = await supabase
          .from('time_sessions')
          .insert({
            user_id: user.id,
            task_id: task.id,
            task_source: 'day_assistant_v2',
            task_title: task.content,
            started_at: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: elapsedSeconds,
            session_type: 'pomodoro'
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Add to local state for immediate display using functional update
        const session: TimerSession = {
          id: data.id,
          duration: minutes,
          date: new Date().toLocaleString('pl-PL'),
          sessionType: 'pomodoro'
        }
        setTimerSessions(prev => [session, ...prev])
        
        toast.success(`✅ Zapisano sesję Pomodoro: ${minutes} min`)
      } catch (error) {
        console.error('Failed to save Pomodoro session:', error)
        toast.error('Nie udało się zapisać sesji Pomodoro')
      }
    }
    
    setElapsedSeconds(0)
  }, [elapsedSeconds, pomodoroPhase, task])
  
  const handleAddLabel = () => {
    if (!newLabel.trim()) return
    if (selectedLabels.includes(newLabel.trim())) return
    setSelectedLabels([...selectedLabels, newLabel.trim()])
    setNewLabel('')
  }
  
  const handleRemoveLabel = (label: string) => {
    setSelectedLabels(selectedLabels.filter(l => l !== label))
  }
  
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    
    setSaving(true)
    
    try {
      const taskData: TaskData = {
        ...(task?.id && { id: task.id }),
        content: content.trim(),
        description: description.trim(),
        estimated_minutes: estimatedMinutes,
        cognitive_load: cognitiveLoad,
        project_id: projectId || undefined,
        priority,
        due: dueDate || undefined,
        labels: selectedLabels
      }
      
      console.log('🎯 [MODAL] Submitting priority:', taskData.priority)
      
      await onSave(taskData)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save task:', error)
      alert('Nie udało się zapisać zadania')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDelete = async () => {
    if (!task?.id || !onDelete) return
    
    if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
      try {
        await onDelete(task.id)
        onOpenChange(false)
      } catch (error) {
        console.error('Failed to delete task:', error)
        alert('Nie udało się usunąć zadania')
      }
    }
  }
  
  const handleComplete = async () => {
    if (!task?.id || !onComplete) return
    
    try {
      await onComplete(task.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to complete task:', error)
      alert('Nie udało się oznaczyć zadania jako ukończone')
    }
  }
  
  const completedSubtasksCount = subtasks.filter(s => s.completed).length
  
  /* =======================
     RENDER
  ======================= */
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 overflow-hidden"
        aria-labelledby="universal-task-modal-title"
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
          <DialogTitle id="universal-task-modal-title" className="flex items-center gap-2 text-lg sm:text-xl">
            <Lightning size={24} className="text-brand-purple" weight="fill" />
            {modalTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Scrollable Content */}
          <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4 flex-1">
            {/* Title Input */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Tytuł zadania <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Co chcesz zrobić?"
                className="w-full px-4 py-2.5 text-base rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Opis (opcjonalny)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodatkowe szczegóły..."
                rows={2}
                className="w-full px-4 py-2.5 text-base rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none resize-none transition"
              />
            </div>

            {/* Desktop: Compact Inline Fields */}
            <div className="hidden md:grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Czas + Trudność */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock size={16} />
                        Czas:
                      </span>
                      <span className="text-brand-purple font-bold text-sm">{estimatedMinutes} min</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={5}
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Brain size={16} />
                        Trudność:
                      </span>
                      <span className="text-brand-purple font-bold text-sm">{cognitiveLoad}/5</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={cognitiveLoad}
                      onChange={(e) => setCognitiveLoad(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                    />
                  </div>
                </div>

                {/* Projekt */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <FolderOpen size={16} />
                    Projekt:
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none transition"
                    disabled={loading}
                  >
                    <option value="">Brak projektu</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Priorytet (compact inline) */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Flag size={16} />
                    Priorytet:
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 1, label: 'P1', color: 'bg-red-500', borderColor: 'border-red-500' },
                      { value: 2, label: 'P2', color: 'bg-orange-500', borderColor: 'border-orange-500' },
                      { value: 3, label: 'P3', color: 'bg-blue-500', borderColor: 'border-blue-500' },
                      { value: 4, label: 'P4', color: 'bg-gray-400', borderColor: 'border-gray-400' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value as 1 | 2 | 3 | 4)}
                        className={`flex-1 px-2 py-2 rounded-lg border-2 transition text-xs font-medium ${
                          priority === opt.value
                            ? `${opt.borderColor} bg-opacity-10`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                          {opt.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Termin (compact) */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <CalendarBlank size={16} />
                    Termin:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none transition"
                    />
                    <div className="flex gap-1">
                      {[
                        { label: 'Dziś', value: format(new Date(), 'yyyy-MM-dd') },
                        { label: 'Jutro', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') }
                      ].map(qd => (
                        <button
                          key={qd.label}
                          type="button"
                          onClick={() => setDueDate(qd.value)}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition whitespace-nowrap"
                        >
                          {qd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Simplified Stack Layout */}
            <div className="md:hidden space-y-3">
              {/* Czas + Trudność inline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      Czas
                    </span>
                    <span className="text-brand-purple font-bold text-xs">{estimatedMinutes}m</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Brain size={14} />
                      Trudność
                    </span>
                    <span className="text-brand-purple font-bold text-xs">{cognitiveLoad}/5</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={cognitiveLoad}
                    onChange={(e) => setCognitiveLoad(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                  />
                </div>
              </div>

              {/* Projekt */}
              <div>
                <label className="text-xs font-medium mb-1 flex items-center gap-1">
                  <FolderOpen size={14} />
                  Projekt
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none"
                  disabled={loading}
                >
                  <option value="">Brak projektu</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Priorytet */}
              <div>
                <label className="text-xs font-medium mb-1 flex items-center gap-1">
                  <Flag size={14} />
                  Priorytet
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 1, label: 'P1', color: 'bg-red-500', borderColor: 'border-red-500' },
                    { value: 2, label: 'P2', color: 'bg-orange-500', borderColor: 'border-orange-500' },
                    { value: 3, label: 'P3', color: 'bg-blue-500', borderColor: 'border-blue-500' },
                    { value: 4, label: 'P4', color: 'bg-gray-400', borderColor: 'border-gray-400' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value as 1 | 2 | 3 | 4)}
                      className={`flex-1 px-2 py-2.5 rounded-lg border-2 transition text-xs font-medium min-h-[44px] ${
                        priority === opt.value
                          ? `${opt.borderColor} bg-opacity-10`
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                        {opt.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Termin */}
              <div>
                <label className="text-xs font-medium mb-1 flex items-center gap-1">
                  <CalendarBlank size={14} />
                  Termin
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none"
                />
                <div className="flex gap-1.5 mt-1.5">
                  {[
                    { label: 'Dziś', value: format(new Date(), 'yyyy-MM-dd') },
                    { label: 'Jutro', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
                    { label: '+3 dni', value: format(addDays(new Date(), 3), 'yyyy-MM-dd') }
                  ].map(qd => (
                    <button
                      key={qd.label}
                      type="button"
                      onClick={() => setDueDate(qd.value)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
                    >
                      {qd.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Etykiety - Unified for Both Desktop & Mobile */}
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Tag size={16} />
                Etykiety
              </label>
              
              {/* Combined Input + Dropdown */}
              <div className="relative">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                  placeholder="Wpisz nową lub wybierz..."
                  list="label-suggestions"
                  className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none transition pr-12"
                />
                <datalist id="label-suggestions">
                  {availableLabels
                    .filter(label => !selectedLabels.includes(label.name))
                    .map(label => (
                      <option key={label.id} value={label.name} />
                    ))}
                </datalist>
                <Button
                  type="button"
                  onClick={handleAddLabel}
                  disabled={!newLabel.trim()}
                  className="absolute right-1 top-1 bottom-1 px-3 text-xs"
                  size="sm"
                >
                  +
                </Button>
              </div>
              
              {/* Selected Labels */}
              {selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedLabels.map(label => (
                    <span
                      key={label}
                      className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center gap-1 cursor-pointer hover:bg-red-100 hover:text-red-800 transition"
                      onClick={() => handleRemoveLabel(label)}
                      title="Kliknij aby usunąć"
                    >
                      {label}
                      <span className="font-bold text-sm">×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

          {/* AI Understanding - Always Visible */}
          {aiUnderstanding && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-900 mb-2">{aiUnderstanding}</p>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  size="sm" 
                  onClick={handleClarify}
                  variant="ghost"
                  className="border border-purple-200 text-xs"
                >
                  Doprecyzuj
                </Button>
                <Button 
                  type="button"
                  size="sm" 
                  onClick={handleGeneratePlan}
                  disabled={loadingAI}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-xs"
                >
                  {loadingAI ? 'Generuję...' : 'Wygeneruj plan'}
                </Button>
              </div>
            </div>
          )}

          {/* Desktop: Collapsible Sections */}
          <div className="hidden sm:block space-y-3 pt-2">

            {/* Subtasks Section */}
            {!hideSubtasks && (
              <CollapsibleSection
                title={`Podzadania (${completedSubtasksCount}/${subtasks.length})`}
                icon={<ListChecks size={18} />}
                defaultOpen={false}
              >
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Dodaj podzadanie..."
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                    className="flex-1"
                  />
                  <Button 
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!newSubtask.trim()}
                  >
                    +
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {subtasks.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Brak podzadań</p>
                  ) : (
                    subtasks.map(sub => (
                      <label key={sub.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                        <input 
                          type="checkbox" 
                          checked={sub.completed}
                          onChange={e => handleToggleSubtask(sub.id, e.target.checked)}
                          className="w-4 h-4 text-brand-purple border-gray-300 rounded focus:ring-brand-purple"
                        />
                        <span className={sub.completed ? 'line-through text-gray-400 text-sm' : 'text-sm'}>
                          {sub.content}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Time Tracking Section - History Only */}
            {!hideTimeTracking && (
              <CollapsibleSection
                title="Historia czasu pracy"
                icon={<Timer size={18} />}
                defaultOpen={false}
              >
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {timerSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <Timer size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-sm text-gray-400">Brak historii czasu pracy</p>
                      <p className="text-xs text-gray-400 mt-1">Sesje zostaną zapisane automatycznie</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary */}
                      <div className="bg-purple-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-900">Całkowity czas:</span>
                          <span className="text-lg font-bold text-purple-700">
                            {timerSessions.reduce((sum, s) => sum + s.duration, 0)} min
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-purple-700">Sesji:</span>
                          <span className="text-sm font-semibold text-purple-700">
                            {timerSessions.length}
                          </span>
                        </div>
                      </div>

                      {/* Session list */}
                      <div className="space-y-1.5">
                        {timerSessions.map((session, idx) => (
                          <div 
                            key={session.id} 
                            className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                                {timerSessions.length - idx}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {session.duration} min
                                </p>
                                <p className="text-xs text-gray-500">{session.date}</p>
                              </div>
                            </div>
                            {session.sessionType && (
                              <Badge variant="outline" className="text-xs">
                                {session.sessionType === 'pomodoro' ? '🍅 Pomodoro' : '⏱️ Manual'}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* History Section */}
            {!hideHistory && isEditMode && (
              <CollapsibleSection
                title="Historia zmian"
                icon={<ClockClockwise size={18} />}
                defaultOpen={false}
              >
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {changeHistory.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Brak historii zmian</p>
                  ) : (
                    changeHistory.map(change => (
                      <div key={change.id} className="bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span className="font-semibold">{change.field}</span>
                          <span className="text-gray-500">
                            {new Date(change.timestamp).toLocaleTimeString('pl-PL', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                          <span className="line-through text-red-600">{change.oldValue}</span>
                          →
                          <span className="text-green-600">{change.newValue}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleSection>
            )}
          </div>

          {/* AI Understanding - Below tabs */}
          {aiUnderstanding && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-900 mb-2">{aiUnderstanding}</p>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  size="sm" 
                  onClick={handleClarify}
                  variant="ghost"
                  className="border border-purple-200 text-xs"
                >
                  Doprecyzuj
                </Button>
                <Button 
                  type="button"
                  size="sm" 
                  onClick={handleGeneratePlan}
                  disabled={loadingAI}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-xs"
                >
                  {loadingAI ? 'Generuję...' : 'Wygeneruj plan'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop & Mobile: Sticky Bottom Buttons */}
        <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-3 sm:py-4 mt-auto">
          {/* Desktop Button Layout */}
          <div className="hidden sm:flex justify-between items-center">
            <div className="flex gap-2">
              {isEditMode && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  className="text-red-600 hover:bg-red-50 gap-2 border border-red-200"
                >
                  <Trash size={16} />
                  Usuń
                </Button>
              )}
              {isEditMode && onComplete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleComplete}
                  className="text-green-600 hover:bg-green-50 gap-2 border border-green-200"
                >
                  <CheckCircle size={16} />
                  Ukończ
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={!content.trim() || saving}
                className="bg-gradient-to-r from-brand-purple to-brand-pink min-w-[100px]"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Zapisywanie...
                  </div>
                ) : (
                  isEditMode ? 'Zapisz' : 'Dodaj'
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Button Layout - Thumb-Friendly */}
          <div className="sm:hidden">
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1 min-h-[48px] border border-gray-300"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={!content.trim() || saving}
                className="flex-1 min-h-[48px] bg-gradient-to-r from-brand-purple to-brand-pink font-semibold"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Zapisywanie...
                  </div>
                ) : (
                  isEditMode ? 'Zapisz' : 'Dodaj'
                )}
              </Button>
            </div>
            
            {/* Secondary actions row for mobile */}
            {isEditMode && (onDelete || onComplete) && (
              <div className="flex gap-2">
                {onComplete && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleComplete}
                    className="flex-1 min-h-[44px] text-green-600 border border-green-200"
                  >
                    <CheckCircle size={18} />
                    Ukończ
                  </Button>
                )}
                {onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDelete}
                    className="flex-1 min-h-[44px] text-red-600 border border-red-200"
                  >
                    <Trash size={18} />
                    Usuń
                  </Button>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-center text-gray-400 mt-2 hidden sm:block">
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> aby zapisać lub <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> aby anulować
          </p>
        </div>
      </form>

        {/* Mobile Bottom Tabs - Above buttons */}
        {((!hideSubtasks && subtasks.length > 0) || (!hideTimeTracking && timerSessions.length > 0) || (!hideHistory && isEditMode)) && (
          <div className="sm:hidden border-t border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex gap-2 overflow-x-auto">
              {!hideSubtasks && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'subtasks' ? null : 'subtasks')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition min-h-[44px] ${
                    activeTab === 'subtasks' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  <ListChecks size={18} weight={activeTab === 'subtasks' ? 'fill' : 'regular'} />
                  <span className="text-sm font-medium">Podzadania ({completedSubtasksCount}/{subtasks.length})</span>
                </button>
              )}
              
              {!hideTimeTracking && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'time' ? null : 'time')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition min-h-[44px] ${
                    activeTab === 'time' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  <Timer size={18} weight={activeTab === 'time' ? 'fill' : 'regular'} />
                  <span className="text-sm font-medium">Czas pracy</span>
                </button>
              )}
              
              {!hideHistory && isEditMode && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'history' ? null : 'history')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition min-h-[44px] ${
                    activeTab === 'history' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  <ClockClockwise size={18} weight={activeTab === 'history' ? 'fill' : 'regular'} />
                  <span className="text-sm font-medium">Historia</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Tab Content Overlay */}
        {activeTab && (
          <div 
            className="sm:hidden fixed inset-0 bg-black/50 z-[60]" 
            onClick={() => setActiveTab(null)}
          >
            <div 
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[65vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close handle */}
              <div className="sticky top-0 bg-white pt-3 pb-2 px-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  {activeTab === 'subtasks' && <><ListChecks size={20} /> Podzadania</>}
                  {activeTab === 'time' && <><Timer size={20} /> Historia czasu</>}
                  {activeTab === 'history' && <><ClockClockwise size={20} /> Historia zmian</>}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <span className="text-2xl text-gray-400">×</span>
                </button>
              </div>

              <div className="p-4 pb-safe">
                {activeTab === 'subtasks' && (
                  <div>
                    <div className="flex gap-2 mb-3">
                      <Input 
                        placeholder="Dodaj podzadanie..."
                        value={newSubtask}
                        onChange={e => setNewSubtask(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                        className="flex-1"
                      />
                      <Button 
                        type="button"
                        onClick={handleAddSubtask}
                        disabled={!newSubtask.trim()}
                        className="min-h-[44px] px-4"
                      >
                        +
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {subtasks.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Brak podzadań</p>
                      ) : (
                        subtasks.map(sub => (
                          <label key={sub.id} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition">
                            <input 
                              type="checkbox" 
                              checked={sub.completed}
                              onChange={e => handleToggleSubtask(sub.id, e.target.checked)}
                              className="w-5 h-5 text-brand-purple border-gray-300 rounded focus:ring-brand-purple"
                            />
                            <span className={sub.completed ? 'line-through text-gray-400 text-sm flex-1' : 'text-sm flex-1'}>
                              {sub.content}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {activeTab === 'time' && (
                  <div>
                    {timerSessions.length === 0 ? (
                      <div className="text-center py-12">
                        <Timer size={56} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-sm text-gray-400">Brak historii czasu pracy</p>
                      </div>
                    ) : (
                      <>
                        {/* Summary */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-900">Całkowity czas:</span>
                            <span className="text-2xl font-bold text-purple-700">
                              {timerSessions.reduce((sum, s) => sum + s.duration, 0)} min
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-purple-700">Liczba sesji:</span>
                            <span className="text-sm font-semibold text-purple-700">
                              {timerSessions.length}
                            </span>
                          </div>
                        </div>

                        {/* Session list */}
                        <div className="space-y-2">
                          {timerSessions.map((session, idx) => (
                            <div 
                              key={session.id} 
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                                  #{timerSessions.length - idx}
                                </div>
                                <div>
                                  <p className="text-base font-semibold text-gray-900">
                                    {session.duration} min
                                  </p>
                                  <p className="text-xs text-gray-500">{session.date}</p>
                                </div>
                              </div>
                              {session.sessionType && (
                                <Badge variant="outline" className="text-xs">
                                  {session.sessionType === 'pomodoro' ? '🍅' : '⏱️'}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'history' && isEditMode && (
                  <div>
                    {changeHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <ClockClockwise size={56} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-sm text-gray-400">Brak historii zmian</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {changeHistory.map(change => (
                          <div key={change.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-sm text-gray-900">{change.field}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(change.timestamp).toLocaleTimeString('pl-PL', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="line-through text-red-600 flex-1">{change.oldValue}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600 flex-1">{change.newValue}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Clarification Modal */}
      <Dialog open={showClarifyModal} onOpenChange={setShowClarifyModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-800">
              <Sparkle size={18} weight="fill" />
              Doprecyzuj zadanie
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Opisz, co chcesz doprecyzować lub co wymaga wyjaśnienia w tym zadaniu:
            </p>
            <Textarea
              value={clarifyText}
              onChange={e => setClarifyText(e.target.value)}
              placeholder="Np. 'Czy to zadanie dotyczy tylko backend czy również frontend?'"
              rows={4}
              className="resize-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowClarifyModal(false)
                  setClarifyText('')
                }}
              >
                Anuluj
              </Button>
              <Button
                type="button"
                onClick={handleSubmitClarification}
                disabled={!clarifyText.trim() || loadingAI}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Sparkle size={16} weight="fill" />
                {loadingAI ? 'Analizuję...' : 'Doprecyzuj'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
