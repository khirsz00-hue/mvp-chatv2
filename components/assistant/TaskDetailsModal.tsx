'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import Separator from '@/components/ui/Separator'
import { CheckCircle, Trash, Pencil, CalendarBlank, Flag, FolderOpen, Clock, Copy, CheckSquare, Timer, Brain } from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { AITaskBreakdownModal } from './AITaskBreakdownModal'
import { useTaskTimer } from './TaskTimer'

interface Subtask {
  id: string
  content: string
  completed: boolean
}

interface Task {
  id:  string
  content: string
  description?:  string
  project_id?:  string
  priority: 1 | 2 | 3 | 4
  due?:  { date: string } | string
  completed?:  boolean
  created_at?: string
  subtasks?: Subtask[]
  duration?: number
  labels?: string[]
}

interface Project {
  id: string
  name: string
  color?: string
}

interface TaskDetailsModalProps {
  open: boolean
  onOpenChange:  (open: boolean) => void
  task: Task | null
  onUpdate?:  (taskId: string, updates: Partial<Task>) => Promise<void>
  onDelete:  (taskId: string) => Promise<void>
  onComplete:  (taskId: string) => Promise<void>
  onDuplicate?:  (task: Task) => Promise<void>
}

export function TaskDetailsModal({ 
  open, 
  onOpenChange, 
  task, 
  onUpdate,
  onDelete,
  onComplete,
  onDuplicate
}: TaskDetailsModalProps) {
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedDueDate, setEditedDueDate] = useState('')
  const [editedPriority, setEditedPriority] = useState<1 | 2 | 3 | 4>(4)
  const [editedProjectId, setEditedProjectId] = useState('')
  const [editedDuration, setEditedDuration] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [notes, setNotes] = useState('')
  const [showAIBreakdown, setShowAIBreakdown] = useState(false)
  const [isCreatingSubtasks, setIsCreatingSubtasks] = useState(false)
  
  const { startTimer } = useTaskTimer()
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  // Fetch projects
  useEffect(() => {
    if (! open || !token) return
    
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/todoist/projects? token=${token}`)
        if (res.ok) {
          const data = await res.json()
          setProjects(data. projects || data || [])
        }
      } catch (err) {
        console.error('Error fetching projects:', err)
      }
    }
    
    fetchProjects()
  }, [open, token])
  
  // Load task data
  useEffect(() => {
    if (task) {
      setEditedTitle(task.content || '')
      setEditedDescription(task.description || '')
      
      const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
      setEditedDueDate(dueStr || '')
      
      setEditedPriority(task. priority || 4)
      setEditedProjectId(task.project_id || '')
      setEditedDuration(task.duration || 0)
      
      // Load notes from localStorage
      const savedNotes = localStorage.getItem(`task_notes_${task.id}`)
      setNotes(savedNotes || '')
    }
  }, [task])
  
  if (!task) return null
  
  const handleSave = async () => {
    if (!onUpdate) {
      setIsEditing(false)
      return
    }
    
    setLoading(true)
    try {
      const updates: Partial<Task> = {
        content: editedTitle,
        description: editedDescription,
        priority: editedPriority
      }
      
      if (editedDueDate) {
        updates.due = editedDueDate
      }
      
      if (editedProjectId) {
        updates.project_id = editedProjectId
      }
      
      if (editedDuration > 0) {
        updates.duration = editedDuration
      }
      
      await onUpdate(task.id, updates)
      
      // Save notes locally
      if (notes.trim()) {
        localStorage.setItem(`task_notes_${task.id}`, notes)
      } else {
        localStorage.removeItem(`task_notes_${task.id}`)
      }
      
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating task:', err)
      alert('Nie udało się zaktualizować zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async () => {
    if (! confirm('Czy na pewno chcesz usunąć to zadanie?')) return
    
    setLoading(true)
    try {
      await onDelete(task.id)
      localStorage.removeItem(`task_notes_${task.id}`)
      onOpenChange(false)
    } catch (err) {
      console.error('Error deleting task:', err)
      alert('Nie udało się usunąć zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const handleComplete = async () => {
    setLoading(true)
    try {
      await onComplete(task.id)
      onOpenChange(false)
    } catch (err) {
      console.error('Error completing task:', err)
      alert('Nie udało się ukończyć zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDuplicate = async () => {
    if (!onDuplicate) return
    
    setLoading(true)
    try {
      await onDuplicate(task)
      onOpenChange(false)
    } catch (err) {
      console.error('Error duplicating task:', err)
      alert('Nie udało się zduplikować zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateSubtasks = async (subtasks: Array<{
    content: string
    description?: string
    duration?: number
    duration_unit?: string
  }>) => {
    try {
      setIsCreatingSubtasks(true)
      
      // Create each subtask via Todoist API
      for (const subtask of subtasks) {
        await fetch('/api/todoist/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: subtask.content,
            description: subtask.description,
            project_id: task.project_id,
            parent_id: task.id,
            priority: task.priority,
            duration: subtask.duration,
            duration_unit: subtask.duration_unit || 'minute'
          })
        })
      }
      
      alert(`Utworzono ${subtasks.length} podzadań!`)
      setShowAIBreakdown(false)
      if (onUpdate) {
        await onUpdate(task.id, {})
      }
    } catch (err) {
      console.error('Error creating subtasks:', err)
      alert('Nie udało się utworzyć podzadań')
    } finally {
      setIsCreatingSubtasks(false)
    }
  }
  
  const handleStartTimer = () => {
    if (task) {
      startTimer(task.id, task.content)
      // Show confirmation
      alert('Timer started!')
    }
  }
  
  const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
  
  const priorityLabels = {
    1: 'Wysoki',
    2: 'Średni',
    3: 'Niski',
    4: 'Brak'
  }
  
  const priorityColors = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-blue-500',
    4: 'bg-gray-400'
  }
  
  const currentProject = projects.find(p => p.id === (editedProjectId || task.project_id))
  
  // Calculate subtasks progress
  const subtasksTotal = task.subtasks?. length || 0
  const subtasksCompleted = task.subtasks?.filter(s => s. completed).length || 0
  const subtasksProgress = subtasksTotal > 0 ?  (subtasksCompleted / subtasksTotal) * 100 : 0
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            {isEditing ? (
              <Input 
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target. value)}
                className="text-xl font-semibold"
                disabled={loading}
              />
            ) : (
              <DialogTitle className="text-2xl flex-1">{task.content}</DialogTitle>
            )}
            
            <div className="flex gap-2 flex-shrink-0">
              {! isEditing ? (
                <>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsEditing(true)}
                    disabled={loading}
                    title="Edytuj"
                  >
                    <Pencil size={18} />
                  </Button>
                  {onDuplicate && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleDuplicate}
                      disabled={loading}
                      title="Duplikuj"
                    >
                      <Copy size={18} />
                    </Button>
                  )}
                </>
              ) : null}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDelete}
                disabled={loading}
                title="Usuń"
                className="text-red-600 hover:bg-red-50"
              >
                <Trash size={18} />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Meta badges */}
          <div className="flex gap-2 flex-wrap">
            {dueStr && (
              <Badge variant="outline" className="gap-1">
                <CalendarBlank size={14} />
                {format(parseISO(dueStr), 'dd MMMM yyyy', { locale:  pl })}
              </Badge>
            )}
            
            {task.priority && (
              <Badge variant={task.priority === 1 ? 'destructive' : 'secondary'} className="gap-1">
                <Flag size={14} />
                P{task.priority} - {priorityLabels[task. priority]}
              </Badge>
            )}
            
            {currentProject && (
              <Badge variant="outline" className="gap-1">
                <FolderOpen size={14} />
                {currentProject.name}
              </Badge>
            )}
            
            {task.duration && task.duration > 0 && (
              <Badge variant="outline" className="gap-1">
                <Clock size={14} />
                {task.duration} min
              </Badge>
            )}
          </div>
          
          <Separator />
          
          {/* Grid Layout:  Left (Details) + Right (Actions) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span>Opis</span>
                  {isEditing && <span className="text-xs text-gray-500">(edycja)</span>}
                </h3>
                {isEditing ? (
                  <Textarea 
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e. target.value)}
                    rows={6}
                    placeholder="Dodaj opis zadania..."
                    disabled={loading}
                  />
                ) : (
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {task.description || 'Brak opisu'}
                  </p>
                )}
              </div>
              
              {/* Subtasks */}
              {subtasksTotal > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckSquare size={18} />
                    Podzadania ({subtasksCompleted}/{subtasksTotal})
                  </h3>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${subtasksProgress}%` }}
                    />
                  </div>
                  
                  {/* Subtasks list */}
                  <div className="space-y-2">
                    {task.subtasks?.map(subtask => (
                      <div 
                        key={subtask.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                      >
                        <CheckCircle 
                          size={18} 
                          weight={subtask.completed ? 'fill' : 'regular'}
                          className={subtask.completed ? 'text-green-600' : 'text-gray-400'}
                        />
                        <span className={subtask.completed ? 'line-through text-gray-500' : ''}>
                          {subtask. content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <div>
                <h3 className="font-semibold mb-2">Notatki (lokalne)</h3>
                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Dodaj prywatne notatki..."
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Notatki są zapisywane tylko lokalnie w przeglądarce
                </p>
              </div>
            </div>
            
            {/* Right: Edit Fields (when editing) */}
            {isEditing && (
              <div className="space-y-4">
                <h3 className="font-semibold">Edycja szczegółów</h3>
                
                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    <CalendarBlank size={16} />
                    Data
                  </label>
                  <Input
                    type="date"
                    value={editedDueDate}
                    onChange={(e) => setEditedDueDate(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    <Flag size={16} />
                    Priorytet
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditedPriority(p as 1 | 2 | 3 | 4)}
                        className={`px-2 py-1.5 rounded border-2 text-sm transition ${
                          editedPriority === p
                            ? 'border-brand-purple bg-brand-purple/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        disabled={loading}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${priorityColors[p as 1 | 2 | 3 | 4]}`} />
                          P{p}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Project */}
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    <FolderOpen size={16} />
                    Projekt
                  </label>
                  <select
                    value={editedProjectId}
                    onChange={(e) => setEditedProjectId(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    disabled={loading}
                  >
                    <option value="">Brak projektu</option>
                    {projects.map(p => (
                      <option key={p.id} value={p. id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    <Clock size={16} />
                    Czas (min)
                  </label>
                  <Input
                    type="number"
                    value={editedDuration || ''}
                    onChange={(e) => setEditedDuration(parseInt(e.target.value) || 0)}
                    min="0"
                    step="5"
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* AI & Timer Actions */}
          {!isEditing && (
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setShowAIBreakdown(true)}
                variant="outline"
                className="gap-2"
                disabled={loading}
              >
                <Brain size={18} weight="fill" />
                AI Breakdown
              </Button>
              
              <Button 
                onClick={handleStartTimer}
                variant="outline"
                className="gap-2"
                disabled={loading}
              >
                <Timer size={18} weight="fill" />
                Start Timer
              </Button>
            </div>
          )}
          
          <Separator />
          
          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-3">
            <Button 
              onClick={handleComplete}
              variant="default"
              className="gap-2 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              <CheckCircle size={18} weight="bold" />
              Ukończ zadanie
            </Button>
            
            {isEditing ?  (
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setIsEditing(false)
                    // Reset to original values
                    setEditedTitle(task.content)
                    setEditedDescription(task.description || '')
                    const dueStr = typeof task.due === 'string' ? task. due : task.due?.date
                    setEditedDueDate(dueStr || '')
                    setEditedPriority(task.priority)
                    setEditedProjectId(task.project_id || '')
                    setEditedDuration(task.duration || 0)
                  }}
                  disabled={loading}
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={loading || !editedTitle.trim()}
                  className="gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    'Zapisz zmiany'
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
      
      {/* AI Task Breakdown Modal */}
      <AITaskBreakdownModal
        open={showAIBreakdown}
        onClose={() => setShowAIBreakdown(false)}
        task={task}
        onCreateSubtasks={handleCreateSubtasks}
      />
    </Dialog>
  )
}
