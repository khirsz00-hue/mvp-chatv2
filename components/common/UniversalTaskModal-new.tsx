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
  Trash,
  Plus,
  X,
  CaretDown,
  Flag,
  MagicWand,
  Question
} from '@phosphor-icons/react'
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
  onAutoSave?: (taskData: TaskData) => void | Promise<void>
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
  onAutoSave,
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
  const [aiExpanded, setAiExpanded] = useState(false)
  
  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  
  // Change history
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([])
  const lastValuesRef = useRef({
    content: '',
    description: '',
    priority: 3 as 1 | 2 | 3 | 4,
    dueDate: ''
  })
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)
  const [hasUnsavedContentChanges, setHasUnsavedContentChanges] = useState(false)
  const initialContentRef = useRef({ content: '', description: '' })
  
  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<'subtasks' | 'history'>('subtasks')
  const [showSubtasksModal, setShowSubtasksModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Refs for dropdown click-outside detection
  const labelPickerRef = useRef<HTMLDivElement>(null)
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  /* =======================
     EFFECTS
  ======================= */
  
  // Close label picker on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (labelPickerRef.current && !labelPickerRef.current.contains(event.target as Node)) {
        setShowLabelPicker(false)
      }
    }
    
    if (showLabelPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLabelPicker])
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
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
            setProjects(data.projects || [])
          } else {
            console.warn('Failed to fetch projects')
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
      
      // Initialize refs
      initialContentRef.current = {
        content: initialContent,
        description: initialDescription
      }
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
      setHasUnsavedContentChanges(false)
      
      initialContentRef.current = {
        content: '',
        description: ''
      }
      
      lastValuesRef.current = {
        content: '',
        description: '',
        priority: 3,
        dueDate: ''
      }
    }
  }, [open, task?.id, defaultDate, task]) // eslint-disable-line react-hooks/exhaustive-deps
  // Note: We intentionally omit individual task properties to prevent re-running on task updates
  
  // Auto-generate AI understanding when title or description changes
  const aiAnalysisRef = useRef<NodeJS.Timeout | null>(null)
  
  const analyzeWithAI = useCallback(async (taskContent: string, taskDesc: string) => {
    if (taskContent.trim().length < 3) {
      setAiUnderstanding('')
      return
    }
    
    setLoadingAI(true)
    
    try {
      const prompt = `Przeanalizuj to zadanie i opisz krótko, jak je rozumiesz. Odpowiedz w 1-2 zdaniach po polsku w formie "Rozumiem, że...".

Tytuł: "${taskContent}"
${taskDesc ? `Opis: "${taskDesc}"` : ''}

Bądź konkretny i pomocny.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAiUnderstanding(data.response || 'Analizuję zadanie...')
      } else {
        // Fallback
        setAiUnderstanding(`Rozumiem: "${taskContent}"`)
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      setAiUnderstanding(`Rozumiem: "${taskContent}"`)
    } finally {
      setLoadingAI(false)
    }
  }, [])
  
  useEffect(() => {
    if (!content.trim() || content.length < 3) {
      setAiUnderstanding('')
      return
    }
    
    // Clear previous timeout
    if (aiAnalysisRef.current) {
      clearTimeout(aiAnalysisRef.current)
    }
    
    // Debounce AI call - wait 800ms after user stops typing
    aiAnalysisRef.current = setTimeout(() => {
      analyzeWithAI(content, description)
    }, 800)
    
    return () => {
      if (aiAnalysisRef.current) {
        clearTimeout(aiAnalysisRef.current)
      }
    }
  }, [content, description, analyzeWithAI])
  
  // Track content/description changes for save button
  useEffect(() => {
    if (isEditMode) {
      const hasChanges = 
        content !== initialContentRef.current.content ||
        description !== initialContentRef.current.description
      setHasUnsavedContentChanges(hasChanges)
    } else {
      // For new tasks, show save button if content is not empty
      setHasUnsavedContentChanges(content.trim().length > 0)
    }
  }, [content, description, isEditMode])
  
  // Auto-save and change tracking for edit mode
  useEffect(() => {
    if (!task?.id || !isEditMode || isSavingRef.current) return
    
    // Check if anything changed (exclude content/description - they need manual save)
    if (
      priority === (task.priority || 3) &&
      dueDate === (task.due || '') &&
      projectId === (task.project_id || '') &&
      JSON.stringify(selectedLabels) === JSON.stringify(task.labels || []) &&
      estimatedMinutes === (task.estimated_minutes || 25)
    ) {
      return
    }
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
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
      
      // Update lastValuesRef (excluding content/description)
      lastValuesRef.current = {
        content: task.content || '',
        description: task.description || '',
        priority,
        dueDate
      }
      
      // Set saving flag to prevent concurrent saves
      isSavingRef.current = true
      
      try {
        // Auto-save but keep modal open - only manual Save button closes it
        const autoSaveHandler = onAutoSave || onSave
        await autoSaveHandler({
          id: task.id,
          content,
          description,
          priority,
          due: dueDate || undefined,
          project_id: projectId || undefined,
          labels: selectedLabels,
          estimated_minutes: estimatedMinutes,
          cognitive_load: cognitiveLoad
        })
      } finally {
        isSavingRef.current = false
      }
    }, 1500) // Increased timeout to give user more time to type
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [content, description, priority, dueDate, projectId, selectedLabels, estimatedMinutes, cognitiveLoad, task?.id, isEditMode, onAutoSave, onSave]) // eslint-disable-line react-hooks/exhaustive-deps
  // Note: We intentionally omit individual task properties to prevent infinite loops from external updates
  
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
          parsed = JSON.parse(data.response)
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError)
          return
        }
        
        if (parsed.subtasks && Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0) {
          const newSubtasks: Subtask[] = parsed.subtasks.map((st: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            content: st.content || st.description || 'Untitled subtask',
            completed: false
          }))
          setSubtasks(newSubtasks)
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
  
  const handleSave = async () => {
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
      
      await onSave(taskData)
      
      // Update initial content ref
      initialContentRef.current = {
        content: content.trim(),
        description: description.trim()
      }
      
      // Don't close modal for edit mode, only for new tasks
      if (!isEditMode) {
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to save task:', error)
      alert('Nie udało się zapisać zadania')
    } finally {
      setSaving(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSave()
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
  const selectedProject = projects.find(p => p.id === projectId)
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  
  const cognitiveLoadLabels = ['B. łatwe', 'Łatwe', 'Średnie', 'Trudne', 'B. trudne']
  const cognitiveLoadColors = [
    'border-emerald-500 bg-emerald-100 text-emerald-800 shadow-sm font-semibold',
    'border-lime-500 bg-lime-100 text-lime-800 shadow-sm font-semibold',
    'border-amber-500 bg-amber-100 text-amber-800 shadow-sm font-semibold',
    'border-orange-500 bg-orange-100 text-orange-800 shadow-sm font-semibold',
    'border-red-500 bg-red-100 text-red-800 shadow-sm font-semibold'
  ]
  
  const priorityColors = {
    1: 'text-red-600 bg-red-50 border-red-300',
    2: 'text-orange-600 bg-orange-50 border-orange-300',
    3: 'text-blue-600 bg-blue-50 border-blue-300',
    4: 'text-slate-500 bg-slate-50 border-slate-300'
  }
  
  /* =======================
     RENDER
  ======================= */
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="w-[95vw] sm:w-[90vw] md:max-w-xl lg:max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200"
          aria-labelledby="universal-task-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b-2 border-violet-200 bg-gradient-to-r from-violet-100 via-purple-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-violet-300">
                <Lightning weight="fill" size={18} />
              </div>
              <span className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                {modalTitle}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-xs text-emerald-700 flex items-center gap-1.5 bg-emerald-100 px-2.5 py-1 rounded-lg font-semibold border border-emerald-300">
                  <CheckCircle weight="fill" size={14} /> Zapisano
                </span>
              )}
              <button 
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all" 
                onClick={() => onOpenChange(false)}
              >
                <X size={20} weight="bold" />
              </button>
            </div>
          </div>

          {/* Scrollable Content - Single scroll area */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 sm:px-6 py-4 space-y-4">
            
            {/* Main Inputs Section */}
            <section className="space-y-2">
              {/* Title */}
              <input 
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-xl sm:text-2xl font-bold text-slate-900 placeholder-slate-400 border-none focus:ring-0 p-0 bg-transparent focus:outline-none" 
                placeholder="Co trzeba zrobić?"
              />
              
              {/* Description */}
              <input 
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-base text-slate-600 placeholder-slate-400 border-none focus:ring-0 p-0 bg-transparent focus:outline-none" 
                placeholder="Dodatkowe szczegóły (opcjonalnie)..."
              />
            </section>

            {/* Properties Grid */}
            <section className="space-y-3">
              {/* Quick Properties as Badges - First Row */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Date Badge */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowDatePicker(!showDatePicker)
                    setShowProjectPicker(false)
                    setShowPriorityPicker(false)
                  }}
                  className="group flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-violet-50 active:bg-violet-100 border-2 border-slate-300 hover:border-violet-500 rounded-xl text-sm font-semibold text-slate-800 hover:text-violet-700 transition-all shadow-sm"
                >
                  <Calendar size={18} className="text-violet-500" />
                  <span>{dueDate ? formatDate(dueDate) : 'Wybierz datę'}</span>
                  <CaretDown size={14} className="text-slate-400 group-hover:text-violet-500" />
                </button>

                {/* Project Badge */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowProjectPicker(!showProjectPicker)
                    setShowDatePicker(false)
                    setShowPriorityPicker(false)
                  }}
                  className="group flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-violet-50 active:bg-violet-100 border-2 border-slate-300 hover:border-violet-500 rounded-xl text-sm font-semibold text-slate-800 hover:text-violet-700 transition-all shadow-sm"
                >
                  <FolderOpen size={18} className="text-violet-500" />
                  <span>{selectedProject?.name || 'Inbox'}</span>
                  <CaretDown size={14} className="text-slate-400 group-hover:text-violet-500" />
                </button>

                {/* Priority Badge */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowPriorityPicker(!showPriorityPicker)
                    setShowDatePicker(false)
                    setShowProjectPicker(false)
                  }}
                  className={`group flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl text-sm font-bold transition-all shadow-sm ${priorityColors[priority]}`}
                >
                  <Flag size={18} weight="fill" />
                  <span>P{priority}</span>
                  <CaretDown size={14} />
                </button>
              </div>

              {/* Tags - Second Row */}
              <div className="flex flex-wrap gap-2 items-center">
                {selectedLabels.map((label) => (
                  <span key={label} className="px-3 py-1.5 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-800 rounded-lg text-sm font-semibold border-2 border-violet-300 flex items-center gap-2 shadow-sm">
                    <Tag size={14} weight="fill" className="text-violet-600" />
                    {label} 
                    <button 
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="hover:text-violet-900 active:text-violet-900 hover:bg-violet-200 rounded-full p-0.5 transition"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </span>
                ))}
                <div className="relative" ref={labelPickerRef}>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowDatePicker(false)
                      setShowProjectPicker(false)
                      setShowPriorityPicker(false)
                      setShowLabelPicker(!showLabelPicker)
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded-lg border border-dashed transition flex items-center gap-1.5 ${
                      showLabelPicker 
                        ? 'border-violet-400 bg-violet-50 text-violet-600' 
                        : 'text-slate-500 hover:bg-slate-100 active:bg-slate-200 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Plus size={14} weight="bold" /> Tag
                  </button>
                  
                  {/* Label Dropdown - Click controlled */}
                  {showLabelPicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-slate-200 min-w-[280px] max-h-[340px] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                      {/* Add New Label Input */}
                      <div className="p-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddLabel()
                              }
                            }}
                            placeholder="Nowa etykieta..."
                            className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddLabel}
                            disabled={!newLabel.trim()}
                            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition shadow-sm"
                          >
                            <Plus size={16} weight="bold" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Available Labels List */}
                      <div className="max-h-[240px] overflow-y-auto p-2">
                        {availableLabels.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-slate-400 text-center italic">
                            Brak dostępnych etykiet.<br/>Dodaj pierwszą powyżej!
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {availableLabels.map((label) => {
                              const isSelected = selectedLabels.includes(label.name)
                              return (
                                <button
                                  key={label.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      handleRemoveLabel(label.name)
                                    } else {
                                      setSelectedLabels([...selectedLabels, label.name])
                                    }
                                  }}
                                  className={`w-full px-3 py-2.5 text-left text-sm rounded-lg transition flex items-center gap-3 ${
                                    isSelected 
                                      ? 'bg-violet-100 text-violet-700 font-medium' 
                                      : 'hover:bg-slate-100 active:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: label.color || '#8b5cf6' }}
                                  />
                                  <span className="flex-1">{label.name}</span>
                                  {isSelected && <CheckCircle size={16} weight="fill" className="text-violet-600" />}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Date Picker */}
              {showDatePicker && (
                <div className="bg-white p-4 rounded-xl border-2 border-violet-300 shadow-xl space-y-3 animate-in slide-in-from-top-2">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Calendar size={16} className="text-violet-500" />
                    Wybierz datę
                  </h4>
                  <div className="flex items-center gap-3">
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-sm font-medium border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none bg-white"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowDatePicker(false)}
                      className="px-5 py-2.5 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition shadow-md"
                    >
                      Zatwierdź
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setDueDate(new Date().toISOString().split('T')[0])
                        setShowDatePicker(false)
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded-xl text-slate-700 transition"
                    >
                      Dziś
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        setDueDate(tomorrow.toISOString().split('T')[0])
                        setShowDatePicker(false)
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded-xl text-slate-700 transition"
                    >
                      Jutro
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const nextWeek = new Date()
                        nextWeek.setDate(nextWeek.getDate() + 7)
                        setDueDate(nextWeek.toISOString().split('T')[0])
                        setShowDatePicker(false)
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded-xl text-slate-700 transition"
                    >
                      Za tydzień
                    </button>
                  </div>
                </div>
              )}

              {/* Expandable Project Picker */}
              {showProjectPicker && (
                <div className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-lg space-y-0.5 sm:space-y-1 animate-in slide-in-from-top-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setProjectId('')
                      setShowProjectPicker(false)
                    }}
                    className="w-full flex items-center gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-violet-50 active:bg-violet-50 rounded-lg transition min-h-[36px]"
                  >
                    <FolderOpen size={isMobile ? 10 : 16} className="text-slate-400" /> Brak projektu
                  </button>
                  {projects.map((project) => (
                    <button 
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setProjectId(project.id)
                        setShowProjectPicker(false)
                      }}
                      className="w-full flex items-center gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-violet-50 active:bg-violet-50 rounded-lg transition min-h-[36px]"
                    >
                      <FolderOpen size={isMobile ? 10 : 16} className="text-violet-500" /> {project.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Expandable Priority Picker */}
              {showPriorityPicker && (
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-lg grid grid-cols-4 gap-1.5 sm:gap-2 animate-in slide-in-from-top-2">
                  {[1, 2, 3, 4].map((p) => (
                    <button 
                      key={p}
                      type="button"
                      onClick={() => {
                        setPriority(p as 1 | 2 | 3 | 4)
                        setShowPriorityPicker(false)
                      }}
                      className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg transition min-h-[48px] ${
                        priority === p 
                          ? `border-2 ${priorityColors[p as 1 | 2 | 3 | 4]}` 
                          : 'hover:bg-gray-50 active:bg-gray-50'
                      }`}
                    >
                      <Flag size={isMobile ? 14 : 18} weight="fill" className={priority === p ? '' : 'text-gray-400'} />
                      <span className={`text-[9px] sm:text-[10px] font-medium ${priority === p ? 'text-current' : 'text-slate-600'}`}>
                        P{p}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Cognitive Load - 5 Levels */}
              <div className="bg-slate-100 p-4 rounded-xl border-2 border-slate-300">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={18} className="text-slate-600" />
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Obciążenie poznawcze</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button 
                      key={level}
                      type="button"
                      onClick={() => setCognitiveLoad(level)}
                      className={`py-2.5 px-1 rounded-lg border-2 text-xs font-semibold transition-all ${
                        cognitiveLoad === level 
                          ? cognitiveLoadColors[level - 1]
                          : 'border-slate-300 hover:border-slate-400 bg-white text-slate-600'
                      }`}
                    >
                      {cognitiveLoadLabels[level - 1]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Estimation */}
              <div className="bg-slate-100 p-4 rounded-xl border-2 border-slate-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Timer size={18} className="text-slate-600" />
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Estymacja czasu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                      min="5" 
                      max="240" 
                      step="5" 
                      className="w-16 text-center text-base font-bold text-violet-700 bg-white px-2 py-1.5 rounded-lg border-2 border-violet-300 focus:ring-2 focus:ring-violet-400 outline-none"
                    />
                    <span className="text-sm font-semibold text-slate-600">min</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">5m</span>
                  <input 
                    type="range" 
                    min="5" 
                    max="240" 
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    step="5" 
                    className="flex-1 h-2 bg-slate-300 rounded-full appearance-none cursor-pointer accent-violet-600 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:shadow-lg"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <span className="text-sm font-medium text-slate-500">4h</span>
                </div>
              </div>

              {/* AI Understanding Section - Collapsible */}
              <div className="bg-gradient-to-r from-violet-100 to-purple-100 border-2 border-violet-300 rounded-xl p-4 shadow-sm">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setAiExpanded(!aiExpanded)}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                    {loadingAI ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkle size={20} weight="fill" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-violet-800 mb-0.5">Analiza AI</h4>
                    <p className={`text-sm text-violet-700 leading-relaxed ${aiExpanded ? '' : 'line-clamp-2'}`}>
                      {loadingAI ? (
                        <span className="italic text-violet-500">Analizuję zadanie...</span>
                      ) : aiUnderstanding ? (
                        aiUnderstanding
                      ) : (
                        <span className="text-violet-500">Wpisz tytuł, aby AI mogło przeanalizować zadanie</span>
                      )}
                    </p>
                  </div>
                  <CaretDown 
                    size={20} 
                    className={`text-violet-500 transition-transform flex-shrink-0 ${aiExpanded ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-violet-200">
                  <button 
                    type="button"
                    onClick={handleClarify}
                    disabled={loadingAI || !content.trim()}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-violet-700 bg-white hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-violet-300 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MagicWand size={16} weight="fill" />
                    Doprecyzuj
                  </button>
                  <button 
                    type="button"
                    onClick={handleGeneratePlan}
                    disabled={loadingAI || !content.trim()}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-violet-700 bg-white hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-violet-300 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Question size={16} weight="fill" />
                    Pomóż zaplanować
                  </button>
                </div>
              </div>
            </section>

            {/* Tabs Section (Desktop) or Buttons (Mobile) */}
            {!hideSubtasks && !hideHistory && (
              <section className="mt-2">
                {isMobile ? (
                  // Mobile: Show buttons that open mini-modals
                  <div className="flex gap-1.5">
                    <button 
                      type="button"
                      onClick={() => setShowSubtasksModal(true)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-md text-[10px] font-medium text-slate-700"
                    >
                      <ListChecks size={10} /> 
                      <span>Podzadania</span>
                      <span className="bg-slate-200 text-slate-600 text-[8px] px-1 py-0.5 rounded-full">
                        {completedSubtasksCount}/{subtasks.length}
                      </span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowHistoryModal(true)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-md text-[10px] font-medium text-slate-700"
                    >
                      <ClockClockwise size={10} /> 
                      <span>Historia</span>
                    </button>
                  </div>
                ) : (
                  // Desktop: Show tabs
                  <>
                    {/* Tab Headers */}
                    <div className="flex items-center gap-4 border-b border-slate-200 mb-1.5 overflow-x-auto">
                      <button 
                        type="button"
                        onClick={() => setActiveTab('subtasks')}
                        className={`flex items-center gap-1 pb-1.5 px-1 text-[11px] font-medium transition-all ${
                          activeTab === 'subtasks'
                            ? 'border-b-2 border-violet-500 text-violet-500'
                            : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <ListChecks size={12} /> Podzadania 
                        <span className="bg-slate-100 text-slate-600 text-[9px] px-1 py-0.5 rounded">
                          {completedSubtasksCount}/{subtasks.length}
                        </span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-1 pb-1.5 px-1 text-[11px] font-medium transition-all ${
                          activeTab === 'history'
                            ? 'border-b-2 border-violet-500 text-violet-500'
                            : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <ClockClockwise size={12} /> Historia
                      </button>
                    </div>

                    {/* Tab Contents */}
                    <div className="max-h-[120px] overflow-y-auto">
                      {activeTab === 'subtasks' && (
                        <div className="space-y-1.5 animate-in fade-in-50">
                          {subtasks.map((subtask) => (
                            <div key={subtask.id} className="flex items-center gap-2 group">
                              <button 
                                type="button"
                                onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                                className={subtask.completed ? 'text-green-500' : 'text-slate-300 hover:text-violet-600 transition'}
                              >
                                {subtask.completed ? (
                                  <CheckCircle size={14} weight="fill" />
                                ) : (
                                  <div className="w-[14px] h-[14px] rounded-full border-2 border-current" />
                                )}
                              </button>
                              <input 
                                type="text" 
                                value={subtask.content}
                                onChange={(e) => {
                                  setSubtasks(subtasks.map(s => 
                                    s.id === subtask.id ? { ...s, content: e.target.value } : s
                                  ))
                                }}
                                className={`flex-1 bg-transparent border-none text-xs focus:ring-0 p-0 placeholder-slate-400 ${
                                  subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                                }`}
                              />
                              <button 
                                type="button"
                                onClick={() => setSubtasks(subtasks.filter(s => s.id !== subtask.id))}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <Plus size={16} className="text-violet-500 flex-shrink-0" />
                            <input 
                              type="text" 
                              value={newSubtask}
                              onChange={(e) => setNewSubtask(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddSubtask()
                                }
                              }}
                              placeholder="Dodaj podzadanie..." 
                              className="flex-1 bg-transparent border-none text-sm text-slate-700 focus:ring-0 p-0 placeholder-slate-400"
                            />
                            {newSubtask.trim() && (
                              <button 
                                type="button"
                                onClick={handleAddSubtask}
                                className="px-3 py-1 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-md transition shadow-sm"
                              >
                                Zapisz
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === 'history' && (
                        <ul className="space-y-2 border-l border-slate-100 ml-1.5 pl-3 py-0.5">
                          {changeHistory.length === 0 ? (
                            <li className="text-xs text-slate-400 italic">Brak historii</li>
                          ) : (
                            changeHistory.map((change) => (
                              <li key={change.id} className="relative text-xs">
                                <div className="absolute -left-[14px] top-1 w-2 h-2 rounded-full bg-slate-300"></div>
                                <span className="text-slate-400 text-[10px]">
                                  {new Date(change.timestamp).toLocaleString('pl-PL')}
                                </span>
                                <p className="text-slate-600">
                                  {change.field}: <span className="font-medium text-violet-600">{change.newValue}</span>
                                </p>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
          </div>

          {/* Footer Actions - Compact */}
          <div className="border-t border-slate-200 px-3 py-2.5 bg-slate-50 flex items-center justify-between gap-2 rounded-b-xl">
            {isEditMode ? (
              <>
                {onDelete && (
                  <button 
                    type="button"
                    onClick={handleDelete}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Usuń zadanie"
                  >
                    <Trash size={16} />
                  </button>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                  {hasUnsavedContentChanges ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setContent(initialContentRef.current.content)
                          setDescription(initialContentRef.current.description)
                          setHasUnsavedContentChanges(false)
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
                      >
                        Anuluj
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleSave()
                          initialContentRef.current = { content, description }
                          setHasUnsavedContentChanges(false)
                        }}
                        className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} weight="fill" />
                        Zapisz
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="px-4 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow transition-all flex items-center gap-1.5"
                    >
                      Zamknij
                      <span className="text-[10px] opacity-75 bg-slate-500 px-1.5 py-0.5 rounded">auto</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Anuluj
                </button>
                
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasUnsavedContentChanges}
                  className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-md disabled:shadow-none transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} weight="bold" />
                  Dodaj
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clarification Modal */}
      <Dialog open={showClarifyModal} onOpenChange={setShowClarifyModal}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <MagicWand size={20} weight="fill" />
              </div>
              Doprecyzuj zadanie
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Powiedz AI więcej o zadaniu, aby lepiej je zrozumiało:
            </p>
            
            <Textarea
              value={clarifyText}
              onChange={(e) => setClarifyText(e.target.value)}
              placeholder="np. 'To zadanie wymaga współpracy z zespołem marketingu' lub 'To jest pilne, ponieważ...'"
              className="min-h-[120px] text-sm border-2 focus:border-violet-400 rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowClarifyModal(false)}
              className="px-5 py-2.5 rounded-xl"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSubmitClarification}
              disabled={!clarifyText.trim() || loadingAI}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 px-5 py-2.5 rounded-xl shadow-lg"
            >
              {loadingAI ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analizuję...
                </span>
              ) : 'Doprecyzuj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Subtasks Modal */}
      {isMobile && (
        <div 
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end transition-all ${
            showSubtasksModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setShowSubtasksModal(false)}
        >
          <div 
            className={`bg-white w-full rounded-t-3xl max-h-[75vh] flex flex-col transform transition-transform shadow-2xl ${
              showSubtasksModal ? 'translate-y-0' : 'translate-y-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <ListChecks size={18} className="text-violet-600" />
                </div>
                Podzadania 
                <span className="bg-violet-100 text-violet-600 text-xs px-2 py-1 rounded-full font-semibold">
                  {completedSubtasksCount}/{subtasks.length}
                </span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowSubtasksModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-400"
              >
                <X size={22} weight="bold" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-3">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-start gap-3 group p-2 bg-slate-50 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                      className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${
                        subtask.completed ? 'text-emerald-500' : 'text-slate-300 active:text-violet-600'
                      }`}
                    >
                      {subtask.completed ? (
                        <CheckCircle size={24} weight="fill" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-current" />
                      )}
                    </button>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={subtask.content}
                        onChange={(e) => {
                          setSubtasks(subtasks.map(s => 
                            s.id === subtask.id ? { ...s, content: e.target.value } : s
                          ))
                        }}
                        className={`w-full bg-transparent border-none text-sm focus:ring-0 p-0 placeholder-slate-400 mb-1 ${
                          subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSubtasks(subtasks.filter(s => s.id !== subtask.id))}
                      className="text-slate-300 active:text-red-500 w-8 h-8 flex items-center justify-center"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-3 mt-4 p-3 border-2 border-dashed border-slate-200 rounded-xl">
                  <button 
                    type="button"
                    onClick={handleAddSubtask}
                    className="text-violet-500 w-8 h-8 flex items-center justify-center"
                  >
                    <Plus size={22} weight="bold" />
                  </button>
                  <input 
                    type="text" 
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSubtask()
                      }
                    }}
                    placeholder="Dodaj podzadanie..." 
                    className="flex-1 bg-transparent border-none text-sm text-slate-700 focus:ring-0 p-0 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile History Modal */}
      {isMobile && (
        <div 
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end transition-all ${
            showHistoryModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setShowHistoryModal(false)}
        >
          <div 
            className={`bg-white w-full rounded-t-3xl max-h-[75vh] flex flex-col transform transition-transform shadow-2xl ${
              showHistoryModal ? 'translate-y-0' : 'translate-y-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <ClockClockwise size={18} className="text-violet-600" />
                </div>
                Historia zmian
              </h3>
              <button 
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-400"
              >
                <X size={22} weight="bold" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ul className="space-y-4 border-l-2 border-violet-200 ml-2 pl-4 py-1">
                {changeHistory.length === 0 ? (
                  <li className="text-sm text-slate-400 italic">Brak historii zmian</li>
                ) : (
                  changeHistory.map((change) => (
                    <li key={change.id} className="relative text-sm">
                      <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-violet-400 border-2 border-white shadow-sm"></div>
                      <span className="text-slate-400 text-xs">
                        {new Date(change.timestamp).toLocaleString('pl-PL')}
                      </span>
                      <p className="text-slate-700">
                        {change.field}: <span className="font-medium text-slate-500">{change.oldValue}</span> → <span className="font-semibold text-violet-600">{change.newValue}</span>
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
