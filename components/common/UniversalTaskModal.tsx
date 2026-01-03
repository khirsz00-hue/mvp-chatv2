'use client'

import { useState, useEffect, useRef } from 'react'
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
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Change history
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([])
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  /* =======================
     EFFECTS
  ======================= */
  
  // Fetch projects and labels on mount
  useEffect(() => {
    if (!open || !token) return
    
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch projects
        const projectsRes = await fetch(`/api/todoist/projects?token=${token}`)
        if (projectsRes.ok) {
          const data = await projectsRes.json()
          setProjects(data.projects || data || [])
        }
        
        // Fetch labels
        const labelsRes = await fetch(`/api/todoist/labels?token=${token}`)
        if (labelsRes.ok) {
          const data = await labelsRes.json()
          setAvailableLabels(data.labels || [])
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
      setContent(task.content || '')
      setDescription(task.description || '')
      setEstimatedMinutes(task.estimated_minutes || 25)
      setCognitiveLoad(task.cognitive_load || 3)
      setProjectId(task.project_id || '')
      setPriority(task.priority || 3)
      setDueDate(task.due || defaultDate || '')
      setSelectedLabels(task.labels || [])
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
  
  /* =======================
     HANDLERS
  ======================= */
  
  const handleClarify = () => {
    setShowClarifyModal(true)
  }
  
  const handleGeneratePlan = async () => {
    setLoadingAI(true)
    try {
      // TODO: Call AI API to generate plan
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAiUnderstanding(`Plan wygenerowany dla: "${content}"`)
    } catch (error) {
      console.error('Failed to generate plan:', error)
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
  
  const stopTimer = () => {
    setIsTimerRunning(false)
    
    if (elapsedSeconds > 0) {
      const session: TimerSession = {
        id: Date.now().toString(),
        duration: Math.floor(elapsedSeconds / 60),
        date: new Date().toLocaleString('pl-PL')
      }
      setTimerSessions([session, ...timerSessions])
    }
    
    setElapsedSeconds(0)
  }
  
  const startPomodoro = () => {
    // TODO: Implement Pomodoro timer
    alert('Pomodoro timer will be implemented')
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
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="universal-task-modal-title"
      >
        <DialogHeader>
          <DialogTitle id="universal-task-modal-title" className="flex items-center gap-2">
            <Lightning size={24} className="text-brand-purple" weight="fill" />
            {modalTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Tytuł zadania <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Co chcesz zrobić?"
              autoFocus
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">Opis (opcjonalny)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowe szczegóły..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none resize-none"
            />
          </div>

          {/* Grid Layout for 2 columns on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estimated Time */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Clock size={18} />
                Estymat czasu:
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[5, 15, 25, 30, 45, 60, 90, 120].map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setEstimatedMinutes(time)}
                    className={`px-2 py-1.5 text-xs rounded border transition ${
                      estimatedMinutes === time
                        ? 'bg-brand-purple text-white border-brand-purple'
                        : 'bg-white border-gray-300 hover:border-brand-purple'
                    }`}
                  >
                    {time}min
                  </button>
                ))}
              </div>
            </div>

            {/* Cognitive Load Slider */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Brain size={18} />
                Obciążenie kognitywne: <span className="font-bold text-brand-purple">{cognitiveLoad}/5</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={cognitiveLoad}
                onChange={(e) => setCognitiveLoad(Number(e.target.value))}
                className="w-full accent-brand-purple"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Łatwe</span>
                <span>Średnie</span>
                <span>Trudne</span>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                <CalendarBlank size={18} />
                Termin:
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none"
              />
              {/* Quick date buttons */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {[
                  { label: 'Dziś', value: format(new Date(), 'yyyy-MM-dd') },
                  { label: 'Jutro', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
                  { label: 'Za 3 dni', value: format(addDays(new Date(), 3), 'yyyy-MM-dd') },
                  { label: 'Za tydzień', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') }
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

            {/* Priority */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Flag size={18} />
                Priorytet:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 1, label: 'P1', color: 'bg-red-500', textColor: 'text-red-700', borderColor: 'border-red-500' },
                  { value: 2, label: 'P2', color: 'bg-orange-500', textColor: 'text-orange-700', borderColor: 'border-orange-500' },
                  { value: 3, label: 'P3', color: 'bg-blue-500', textColor: 'text-blue-700', borderColor: 'border-blue-500' },
                  { value: 4, label: 'P4', color: 'bg-gray-400', textColor: 'text-gray-700', borderColor: 'border-gray-400' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value as 1 | 2 | 3 | 4)}
                    className={`px-3 py-2 rounded-lg border-2 transition text-sm font-medium ${
                      priority === opt.value
                        ? `${opt.borderColor} bg-opacity-10 ${opt.textColor}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Project Dropdown */}
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                <FolderOpen size={18} />
                Projekt:
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none"
                disabled={loading}
              >
                <option value="">Brak projektu</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Labels */}
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                <Tag size={18} />
                Etykiety:
              </label>
              
              {/* Add new label input */}
              <div className="flex gap-2 mb-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                  placeholder="Dodaj etykietę..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddLabel}
                  disabled={!newLabel.trim()}
                >
                  +
                </Button>
              </div>
              
              {/* Selected Labels - click to remove */}
              <div className="flex flex-wrap gap-2">
                {selectedLabels.map(label => (
                  <span
                    key={label}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1 cursor-pointer hover:bg-red-100 hover:text-red-800 transition"
                    onClick={() => handleRemoveLabel(label)}
                    title="Kliknij aby usunąć"
                  >
                    {label}
                    <span className="font-bold">×</span>
                  </span>
                ))}
              </div>
              
              {/* Available labels dropdown (from Todoist) */}
              {availableLabels.length > 0 && (
                <select
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none mt-2"
                  value=""
                  onChange={(e) => {
                    const label = e.target.value
                    if (label && !selectedLabels.includes(label)) {
                      setSelectedLabels([...selectedLabels, label])
                    }
                  }}
                  disabled={loading}
                >
                  <option value="">Wybierz z Todoist...</option>
                  {availableLabels
                    .filter(label => !selectedLabels.includes(label.name))
                    .map(label => (
                      <option key={label.id} value={label.name}>
                        {label.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>

          {/* Collapsible Sections */}
          <div className="space-y-3 pt-2">
            {/* AI Understanding Section */}
            <CollapsibleSection
              title="Jak AI rozumie zadanie"
              icon={<Brain size={18} />}
              defaultOpen={false}
            >
              <div className="flex gap-2 mb-2">
                <Button 
                  type="button"
                  size="sm" 
                  onClick={handleClarify}
                  variant="ghost"
                  className="border border-gray-200"
                >
                  Doprecyzuj
                </Button>
                <Button 
                  type="button"
                  size="sm" 
                  onClick={handleGeneratePlan}
                  disabled={loadingAI}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {loadingAI ? 'Generuję...' : 'Wygeneruj plan'}
                </Button>
              </div>
              {loadingAI ? (
                <div className="text-xs text-gray-500">Analizuję zadanie...</div>
              ) : aiUnderstanding ? (
                <p className="text-xs text-purple-900 bg-purple-50 p-3 rounded-lg">{aiUnderstanding}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">Wpisz tytuł zadania aby zobaczyć jak AI je rozumie</p>
              )}
            </CollapsibleSection>

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

            {/* Time Tracking Section */}
            {!hideTimeTracking && (
              <CollapsibleSection
                title="Mierzenie czasu"
                icon={<Timer size={18} />}
                defaultOpen={false}
              >
                {/* Tabs: Manual / Pomodoro */}
                <div className="flex gap-2 border-b mb-3">
                  <button 
                    type="button"
                    onClick={() => setTimeTab('manual')}
                    className={`px-3 py-2 text-sm font-medium ${
                      timeTab === 'manual' 
                        ? 'border-b-2 border-purple-600 text-purple-600' 
                        : 'text-gray-500'
                    }`}
                  >
                    ⏱️ Manual
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTimeTab('pomodoro')}
                    className={`px-3 py-2 text-sm font-medium ${
                      timeTab === 'pomodoro' 
                        ? 'border-b-2 border-purple-600 text-purple-600' 
                        : 'text-gray-500'
                    }`}
                  >
                    🍅 Pomodoro
                  </button>
                </div>

                {timeTab === 'manual' && (
                  <div>
                    <div className="text-center text-3xl font-mono mb-3 font-bold text-purple-700">
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="flex gap-2 justify-center mb-3">
                      <Button 
                        type="button"
                        onClick={startTimer}
                        disabled={isTimerRunning}
                        size="sm"
                        className="gap-1"
                      >
                        <Play size={16} weight="fill" /> Start
                      </Button>
                      <Button 
                        type="button"
                        onClick={pauseTimer}
                        disabled={!isTimerRunning}
                        size="sm"
                        variant="ghost"
                        className="gap-1 border border-gray-200"
                      >
                        <Pause size={16} weight="fill" /> Pause
                      </Button>
                      <Button 
                        type="button"
                        onClick={stopTimer}
                        disabled={elapsedSeconds === 0}
                        size="sm"
                        variant="ghost"
                        className="gap-1 border border-gray-200"
                      >
                        <Stop size={16} weight="fill" /> Stop
                      </Button>
                    </div>
                    
                    {/* Mini history - last 3 sessions */}
                    {timerSessions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-600 mb-2">Ostatnie sesje:</p>
                        <div className="text-xs space-y-1">
                          {timerSessions.slice(0, 3).map(s => (
                            <div key={s.id} className="text-gray-600">
                              • {s.duration} min - {s.date}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {timeTab === 'pomodoro' && (
                  <div className="text-center py-4">
                    <Button 
                      type="button"
                      onClick={startPomodoro}
                      className="bg-gradient-to-r from-red-500 to-orange-500"
                    >
                      🍅 Start Pomodoro (25min)
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      25 minut pracy + 5 minut przerwy
                    </p>
                  </div>
                )}
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
                          <span className="text-gray-500">{change.timestamp}</span>
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

          {/* Submit Buttons with improved layout */}
          <DialogFooter className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {isEditMode && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  className="text-red-600 hover:bg-red-50 gap-2"
                >
                  <Trash size={18} />
                  Usuń
                </Button>
              )}
              {isEditMode && onComplete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleComplete}
                  className="text-green-600 hover:bg-green-50 gap-2"
                >
                  <CheckCircle size={18} />
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
                className="bg-gradient-to-r from-brand-purple to-brand-pink gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  isEditMode ? 'Zapisz zmiany' : 'Utwórz zadanie'
                )}
              </Button>
            </div>
          </DialogFooter>

          <p className="text-xs text-center text-gray-500" role="note">
            Naciśnij <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> aby zapisać lub <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> aby anulować
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
