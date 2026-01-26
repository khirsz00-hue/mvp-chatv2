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
  WandSparkles,
  Question
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
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
  
  // Change history
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([])
  const lastValuesRef = useRef({
    content: '',
    description: '',
    priority: 3 as 1 | 2 | 3 | 4,
    dueDate: ''
  })
  
  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<'subtasks' | 'history'>('subtasks')
  const [showSubtasksModal, setShowSubtasksModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  /* =======================
     EFFECTS
  ======================= */
  
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
    
    const timeout = setTimeout(() => {
      // Simple AI understanding for now
      setAiUnderstanding(`Zrozumiałem: "${content}"`)
    }, 1000)
    
    return () => clearTimeout(timeout)
  }, [content])
  
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
  const selectedProject = projects.find(p => p.id === projectId)
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  
  const cognitiveLoadLabels = ['Łatwe', 'Proste', 'Średnie', 'Trudne']
  const cognitiveLoadColors = [
    'border-green-300 bg-green-50 text-green-700',
    'border-lime-300 bg-lime-50 text-lime-700',
    'border-amber-300 bg-amber-50 text-amber-700',
    'border-orange-300 bg-orange-50 text-orange-700'
  ]
  
  const priorityColors = {
    1: 'text-red-500 bg-red-50 border-red-200',
    2: 'text-orange-400 bg-orange-50 border-orange-200',
    3: 'text-blue-500 bg-blue-50 border-blue-200',
    4: 'text-gray-400 bg-gray-50 border-gray-200'
  }
  
  /* =======================
     RENDER
  ======================= */
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="w-full max-w-[95vw] sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden flex flex-col"
          aria-labelledby="universal-task-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-white sticky top-0 z-20">
            <div className="flex items-center gap-2 sm:gap-3 text-slate-500">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                <Lightning weight="fill" size={isMobile ? 14 : 16} />
              </div>
              <span className="font-medium text-[10px] sm:text-sm uppercase tracking-wide">
                {modalTitle}
              </span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {saving && (
                <span className="text-[9px] sm:text-xs text-green-600 flex items-center gap-1 sm:gap-1.5 bg-green-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  <CheckCircle weight="fill" size={isMobile ? 12 : 14} /> Zapisano
                </span>
              )}
              <button 
                type="button"
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" 
                onClick={() => onOpenChange(false)}
              >
                <X size={isMobile ? 18 : 20} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-6">
            
            {/* Main Inputs Section */}
            <section className="space-y-2 sm:space-y-4">
              {/* Title */}
              <div>
                <input 
                  type="text" 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-lg sm:text-2xl font-bold text-slate-800 placeholder-slate-300 border-none focus:ring-0 p-0 bg-transparent focus:outline-none" 
                  placeholder="Co trzeba zrobić?"
                />
              </div>
              
              {/* Description */}
              <div>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs sm:text-base text-slate-600 placeholder-slate-400 border-none focus:ring-0 p-0 bg-transparent focus:outline-none resize-none h-10 sm:h-16" 
                  placeholder="Dodatkowe szczegóły (opcjonalnie)..."
                />
              </div>
            </section>

            {/* Compact Properties Grid */}
            <section className="space-y-2 sm:space-y-3">
              {/* Quick Properties as Badges - First Row */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                {/* Date Badge */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowDatePicker(!showDatePicker)
                    setShowProjectPicker(false)
                    setShowPriorityPicker(false)
                  }}
                  className="group relative flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-slate-100 hover:bg-violet-50 active:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-full text-[10px] sm:text-xs font-medium text-slate-700 hover:text-violet-700 transition-all min-h-[32px] sm:min-h-auto"
                >
                  <Calendar size={isMobile ? 10 : 14} className="text-slate-400 group-hover:text-violet-500" />
                  <span>{dueDate ? formatDate(dueDate) : 'Brak terminu'}</span>
                  <CaretDown size={isMobile ? 8 : 10} className="text-slate-300 group-hover:text-violet-400" />
                </button>

                {/* Project Badge */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowProjectPicker(!showProjectPicker)
                    setShowDatePicker(false)
                    setShowPriorityPicker(false)
                  }}
                  className="group relative flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-slate-100 hover:bg-violet-50 active:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-full text-[10px] sm:text-xs font-medium text-slate-700 hover:text-violet-700 transition-all min-h-[32px] sm:min-h-auto"
                >
                  <FolderOpen size={isMobile ? 10 : 14} className="text-slate-400 group-hover:text-violet-500" />
                  <span>{selectedProject?.name || 'Brak projektu'}</span>
                  <CaretDown size={isMobile ? 8 : 10} className="text-slate-300 group-hover:text-violet-400" />
                </button>

                {/* Priority Badge */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowPriorityPicker(!showPriorityPicker)
                    setShowDatePicker(false)
                    setShowProjectPicker(false)
                  }}
                  className={`group relative flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 border rounded-full text-[10px] sm:text-xs font-medium transition-all min-h-[32px] sm:min-h-auto ${priorityColors[priority]}`}
                >
                  <Flag size={isMobile ? 10 : 14} weight="fill" />
                  <span>P{priority}</span>
                  <CaretDown size={isMobile ? 8 : 10} />
                </button>
              </div>

              {/* Tags - Second Row */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                {selectedLabels.map((label) => (
                  <span key={label} className="px-2 sm:px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-[10px] sm:text-xs font-medium border border-violet-200 flex items-center gap-1 sm:gap-1.5 min-h-[32px] sm:min-h-auto">
                    #{label} 
                    <button 
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="hover:text-violet-900 active:text-violet-900 ml-0.5"
                    >
                      <X size={isMobile ? 8 : 10} />
                    </button>
                  </span>
                ))}
                <button 
                  type="button"
                  onClick={() => {
                    const label = prompt('Wprowadź tag:')
                    if (label?.trim()) {
                      setSelectedLabels([...selectedLabels, label.trim()])
                    }
                  }}
                  className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-slate-500 hover:bg-slate-100 active:bg-slate-100 rounded-full border border-dashed border-slate-300 transition flex items-center gap-1 min-h-[32px] sm:min-h-auto"
                >
                  <Plus size={isMobile ? 8 : 10} /> Tag
                </button>
              </div>

              {/* Expandable Date Picker */}
              {showDatePicker && (
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-lg space-y-2 sm:space-y-3 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-300 focus:border-violet-300 outline-none min-h-[36px]"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowDatePicker(false)}
                      className="px-3 py-2 text-[10px] sm:text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 active:bg-violet-700 transition min-h-[36px]"
                    >
                      OK
                    </button>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setDueDate(new Date().toISOString().split('T')[0])
                        setShowDatePicker(false)
                      }}
                      className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium bg-slate-50 hover:bg-slate-100 active:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition min-h-[36px]"
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
                      className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium bg-slate-50 hover:bg-slate-100 active:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition min-h-[36px]"
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
                      className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium bg-slate-50 hover:bg-slate-100 active:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition min-h-[36px]"
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

              {/* Cognitive Load as Buttons - 4 LEVELS ONLY */}
              <div className="mt-3 sm:mt-5">
                <h3 className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <Brain size={isMobile ? 10 : 14} className="text-slate-400" />
                  Obciążenie poznawcze
                </h3>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4].map((level) => (
                    <button 
                      key={level}
                      type="button"
                      onClick={() => setCognitiveLoad(level)}
                      className={`h-10 rounded-lg border-2 transition-all flex flex-col items-center justify-center min-h-[40px] ${
                        cognitiveLoad === level 
                          ? cognitiveLoadColors[level - 1]
                          : 'border-slate-200 hover:border-slate-300 active:border-slate-300'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                        cognitiveLoad === level 
                          ? 'bg-current' 
                          : 'bg-slate-300'
                      }`} />
                      <span className={`text-[8px] sm:text-[9px] mt-0.5 ${
                        cognitiveLoad === level 
                          ? 'font-medium' 
                          : 'text-slate-400'
                      }`}>
                        {cognitiveLoadLabels[level - 1]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Estimation */}
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 mt-3">
                <div>
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <h3 className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                      <Timer size={isMobile ? 10 : 14} className="text-slate-400" />
                      Estymacja Czasu
                    </h3>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <input 
                        type="number" 
                        value={estimatedMinutes}
                        onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                        min="5" 
                        max="240" 
                        step="5" 
                        className="w-12 sm:w-16 text-center text-xs sm:text-sm font-bold text-violet-600 bg-violet-100 px-1 sm:px-2 py-1 rounded border-none focus:ring-2 focus:ring-violet-300 outline-none min-h-[28px]"
                      />
                      <span className="text-[10px] sm:text-xs text-slate-500">min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-[9px] sm:text-xs text-slate-400 whitespace-nowrap">5m</span>
                    <input 
                      type="range" 
                      min="5" 
                      max="240" 
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                      step="5" 
                      className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <span className="text-[9px] sm:text-xs text-slate-400 whitespace-nowrap">4h</span>
                  </div>
                </div>
              </div>

              {/* AI Understanding Section */}
              <div className="bg-violet-50/50 border border-violet-100/50 rounded-lg p-2.5 sm:p-3 mt-3">
                <div className="flex items-start gap-1.5 sm:gap-2 mb-2">
                  <Sparkle size={isMobile ? 12 : 14} weight="fill" className="text-violet-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-[10px] sm:text-xs font-medium text-violet-700 mb-0.5 sm:mb-1">
                      Jak AI rozumie to zadanie
                    </h4>
                    <p className="text-[10px] sm:text-xs text-violet-600 leading-relaxed">
                      {aiUnderstanding || 'Wpisz tytuł zadania, aby AI mogło je zrozumieć...'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 ml-4 sm:ml-5">
                  <button 
                    type="button"
                    onClick={handleClarify}
                    className="px-2 py-1.5 text-[9px] sm:text-[11px] font-medium text-violet-600 bg-white hover:bg-violet-100 active:bg-violet-100 border border-violet-200 rounded-md transition-all flex items-center gap-1 sm:gap-1.5 min-h-[32px]"
                  >
                    <WandSparkles size={isMobile ? 10 : 12} />
                    Doprecyzuj
                  </button>
                  <button 
                    type="button"
                    onClick={handleGeneratePlan}
                    className="px-2 py-1.5 text-[9px] sm:text-[11px] font-medium text-violet-600 bg-white hover:bg-violet-100 active:bg-violet-100 border border-violet-200 rounded-md transition-all flex items-center gap-1 sm:gap-1.5 min-h-[32px]"
                  >
                    <Question size={isMobile ? 10 : 12} />
                    Pomóż mi
                  </button>
                </div>
              </div>
            </section>

            {/* Tabs Section (Desktop) or Buttons (Mobile) */}
            {!hideSubtasks && !hideHistory && (
              <section className="mt-4 sm:mt-6">
                {isMobile ? (
                  // Mobile: Show buttons that open mini-modals
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowSubtasksModal(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 min-h-[44px]"
                    >
                      <ListChecks size={12} /> 
                      <span>Podzadania</span>
                      <span className="bg-slate-200 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-full ml-0.5">
                        {completedSubtasksCount}/{subtasks.length}
                      </span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowHistoryModal(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 min-h-[44px]"
                    >
                      <ClockClockwise size={12} /> 
                      <span>Historia</span>
                    </button>
                  </div>
                ) : (
                  // Desktop: Show tabs
                  <>
                    {/* Tab Headers */}
                    <div className="flex items-center gap-6 border-b border-slate-200 mb-4 overflow-x-auto">
                      <button 
                        type="button"
                        onClick={() => setActiveTab('subtasks')}
                        className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium transition-all ${
                          activeTab === 'subtasks'
                            ? 'border-b-2 border-violet-500 text-violet-500'
                            : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                        }`}
                      >
                        <ListChecks size={16} /> Podzadania 
                        <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                          {completedSubtasksCount}/{subtasks.length}
                        </span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium transition-all ${
                          activeTab === 'history'
                            ? 'border-b-2 border-violet-500 text-violet-500'
                            : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                        }`}
                      >
                        <ClockClockwise size={16} /> Historia
                      </button>
                    </div>

                    {/* Tab Contents */}
                    <div className="min-h-[150px]">
                      {activeTab === 'subtasks' && (
                        <div className="space-y-2 animate-in fade-in-50">
                          {subtasks.map((subtask) => (
                            <div key={subtask.id} className="flex items-center gap-3 group">
                              <button 
                                type="button"
                                onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                                className={subtask.completed ? 'text-green-500' : 'text-slate-300 hover:text-violet-600 transition'}
                              >
                                {subtask.completed ? (
                                  <CheckCircle size={18} weight="fill" />
                                ) : (
                                  <div className="w-[18px] h-[18px] rounded-full border-2 border-current" />
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
                                className={`flex-1 bg-transparent border-none text-sm focus:ring-0 p-0 placeholder-slate-400 ${
                                  subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                                }`}
                              />
                              <button 
                                type="button"
                                onClick={() => setSubtasks(subtasks.filter(s => s.id !== subtask.id))}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-3 group mt-3">
                            <button 
                              type="button"
                              className="text-slate-300 hover:text-violet-600 transition"
                            >
                              <Plus size={18} />
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
                      )}

                      {activeTab === 'history' && (
                        <ul className="space-y-4 border-l-2 border-slate-100 ml-2 pl-4 py-1">
                          {changeHistory.length === 0 ? (
                            <li className="text-sm text-slate-400 italic">Brak historii zmian</li>
                          ) : (
                            changeHistory.map((change) => (
                              <li key={change.id} className="relative text-sm">
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
                                <span className="text-slate-500 text-xs">
                                  {new Date(change.timestamp).toLocaleString('pl-PL')}
                                </span>
                                <p className="text-slate-700">
                                  {change.field}: <span className="font-medium">{change.oldValue}</span> → <span className="font-medium text-violet-600">{change.newValue}</span>
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

          {/* Footer Actions */}
          <div className="border-t border-slate-100 p-3 sm:p-4 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 rounded-b-2xl">
            {isMobile ? (
              <>
                <button 
                  type="button"
                  onClick={handleComplete}
                  className="w-full bg-violet-600 active:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-violet-200 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <CheckCircle size={16} weight="fill" /> Ukończ zadanie
                </button>
                
                {onDelete && (
                  <button 
                    type="button"
                    onClick={handleDelete}
                    className="text-slate-400 active:text-red-500 active:bg-red-50 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    <Trash size={12} />
                    <span>Usuń zadanie</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {onDelete && (
                  <button 
                    type="button"
                    onClick={handleDelete}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm flex items-center gap-2 group"
                  >
                    <Trash size={16} />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 -ml-2 group-hover:ml-0">
                      Usuń
                    </span>
                  </button>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-400 italic mr-2 hidden sm:block">
                    Enter aby zapisać, Esc aby wyjść
                  </div>
                  <button 
                    type="button"
                    onClick={handleComplete}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all transform active:scale-95 flex items-center gap-2"
                  >
                    <CheckCircle size={18} weight="fill" /> Ukończ zadanie
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clarification Modal */}
      <Dialog open={showClarifyModal} onOpenChange={setShowClarifyModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WandSparkles size={20} className="text-violet-600" />
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
              className="min-h-[120px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClarifyModal(false)}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSubmitClarification}
              disabled={!clarifyText.trim() || loadingAI}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {loadingAI ? 'Analizuję...' : 'Doprecyzuj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Subtasks Modal */}
      {isMobile && (
        <div 
          className={`fixed inset-0 bg-black/40 z-50 flex items-end transition-all ${
            showSubtasksModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setShowSubtasksModal(false)}
        >
          <div 
            className={`bg-white w-full rounded-t-2xl max-h-[70vh] flex flex-col transform transition-transform ${
              showSubtasksModal ? 'translate-y-0' : 'translate-y-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ListChecks size={18} className="text-violet-600" />
                Podzadania 
                <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                  {completedSubtasksCount}/{subtasks.length}
                </span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowSubtasksModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2.5">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 group min-h-[40px]">
                    <button 
                      type="button"
                      onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                      className={`w-7 h-7 flex items-center justify-center ${
                        subtask.completed ? 'text-green-500' : 'text-slate-300 active:text-violet-600'
                      }`}
                    >
                      {subtask.completed ? (
                        <CheckCircle size={18} weight="fill" />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full border-2 border-current" />
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
                      className="text-slate-300 active:text-red-500 w-7 h-7 flex items-center justify-center"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 group mt-2 min-h-[40px]">
                  <button 
                    type="button"
                    className="text-slate-300 active:text-violet-600 w-7 h-7 flex items-center justify-center"
                  >
                    <Plus size={18} />
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
                    className="flex-1 bg-transparent border-none text-xs text-slate-700 focus:ring-0 p-0 placeholder-slate-400"
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
          className={`fixed inset-0 bg-black/40 z-50 flex items-end transition-all ${
            showHistoryModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setShowHistoryModal(false)}
        >
          <div 
            className={`bg-white w-full rounded-t-2xl max-h-[70vh] flex flex-col transform transition-transform ${
              showHistoryModal ? 'translate-y-0' : 'translate-y-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ClockClockwise size={18} className="text-violet-600" />
                Historia zmian
              </h3>
              <button 
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-3 border-l-2 border-slate-100 ml-2 pl-3 py-1">
                {changeHistory.length === 0 ? (
                  <li className="text-xs text-slate-400 italic">Brak historii zmian</li>
                ) : (
                  changeHistory.map((change) => (
                    <li key={change.id} className="relative text-xs">
                      <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(change.timestamp).toLocaleString('pl-PL')}
                      </span>
                      <p className="text-slate-700">
                        {change.field}: <span className="font-medium">{change.oldValue}</span> → <span className="font-medium text-violet-600">{change.newValue}</span>
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
