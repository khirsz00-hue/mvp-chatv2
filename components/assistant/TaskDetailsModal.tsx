'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import Separator from '@/components/ui/Separator'
import { CheckCircle, Trash, Pencil, CalendarBlank, Flag, FolderOpen, Clock, Copy, CheckSquare, Timer, Brain, Sparkle, Tag } from '@phosphor-icons/react'
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
  const [editedLabels, setEditedLabels] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(true) // Default to editing mode
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [showAIBreakdown, setShowAIBreakdown] = useState(false)
  const [isCreatingSubtasks, setIsCreatingSubtasks] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  
  const { startTimer } = useTaskTimer()
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  // Fetch projects
  useEffect(() => {
    if (! open || !token) return
    
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/todoist/projects?token=${token}`)
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || data || [])
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
      setEditedLabels(task.labels || [])
      setIsEditing(true) // Always start in edit mode
      setAiSuggestions(null) // Reset suggestions
    }
  }, [task])
  
  // Constants
  const MIN_TITLE_LENGTH_FOR_SUGGESTIONS = 5
  
  // Fetch AI suggestions when title changes (with debounce)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!isEditing || !editedTitle) {
      return
    }
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Reset if too short
    if (editedTitle.length < MIN_TITLE_LENGTH_FOR_SUGGESTIONS) {
      setAiSuggestions(null)
      return
    }
    
    // Skip if title hasn't changed and we already have suggestions
    if (editedTitle === task?.content && aiSuggestions !== null) {
      return
    }
    
    setLoadingSuggestions(true)
    
    // Debounce for 1 second
    debounceTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          const userId = token || 'anonymous'
          const response = await fetch('/api/ai/suggest-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              title: editedTitle,
              userId,
              userContext: {
                projects: projects.map(p => ({ id: p.id, name: p.name }))
              }
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            setAiSuggestions(data)
          }
        } catch (err) {
          console.error('Error fetching AI suggestions:', err)
        } finally {
          setLoadingSuggestions(false)
        }
      })()
    }, 1000)
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedTitle, isEditing, task?.content, token, projects])
  
  if (!task) return null
  
  const applySuggestion = (field: 'priority' | 'duration' | 'description' | 'project' | 'dueDate' | 'labels') => {
    if (!aiSuggestions) return
    
    switch (field) {
      case 'priority':
        if (aiSuggestions.priority) {
          setEditedPriority(aiSuggestions.priority as 1 | 2 | 3 | 4)
        }
        break
      case 'duration':
        if (aiSuggestions.estimatedMinutes) {
          setEditedDuration(aiSuggestions.estimatedMinutes)
        }
        break
      case 'description':
        if (aiSuggestions.description) {
          setEditedDescription(aiSuggestions.description)
        }
        break
      case 'project':
        if (aiSuggestions.suggestedProject) {
          const project = projects.find(p => p.name === aiSuggestions.suggestedProject)
          if (project) {
            setEditedProjectId(project.id)
          }
        }
        break
      case 'dueDate':
        if (aiSuggestions.suggestedDueDate) {
          setEditedDueDate(aiSuggestions.suggestedDueDate)
        }
        break
      case 'labels':
        if (aiSuggestions.suggestedLabels && aiSuggestions.suggestedLabels.length > 0) {
          setEditedLabels(aiSuggestions.suggestedLabels)
        }
        break
    }
  }

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
      
      if (editedLabels.length > 0) {
        updates.labels = editedLabels
      }
      
      await onUpdate(task.id, updates)
      
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <>
                  <Input 
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xl font-semibold w-full"
                    disabled={loading}
                    placeholder="Tytuł zadania..."
                  />
                  
                  {/* AI Suggestions */}
                  {loadingSuggestions && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-3 h-3 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                      <span>Generuję sugestie AI...</span>
                    </div>
                  )}
                  
                  {aiSuggestions && !loadingSuggestions && (
                    <div className="mt-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2 mb-1.5">
                        <Sparkle size={14} weight="fill" className="text-blue-600 mt-0.5" />
                        <p className="text-xs text-blue-800 font-medium">AI Suggestions:</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSuggestions.priority && aiSuggestions.priority !== editedPriority && (
                          <Badge
                            className="cursor-pointer hover:bg-blue-200 transition-colors gap-1 text-xs py-0.5"
                            onClick={() => applySuggestion('priority')}
                          >
                            <Flag size={12} />
                            P{aiSuggestions.priority}
                          </Badge>
                        )}
                        {aiSuggestions.estimatedMinutes && (
                          <Badge
                            className="cursor-pointer hover:bg-blue-200 transition-colors gap-1 text-xs py-0.5"
                            onClick={() => applySuggestion('duration')}
                          >
                            <Clock size={12} />
                            {aiSuggestions.estimatedMinutes}min
                          </Badge>
                        )}
                        {aiSuggestions.suggestedDueDate && (
                          <Badge
                            className="cursor-pointer hover:bg-blue-200 transition-colors gap-1 text-xs py-0.5"
                            onClick={() => applySuggestion('dueDate')}
                          >
                            <CalendarBlank size={12} />
                            {aiSuggestions.suggestedDueDate}
                          </Badge>
                        )}
                        {aiSuggestions.suggestedProject && (
                          <Badge
                            className="cursor-pointer hover:bg-blue-200 transition-colors gap-1 text-xs py-0.5"
                            onClick={() => applySuggestion('project')}
                          >
                            <FolderOpen size={12} />
                            {aiSuggestions.suggestedProject}
                          </Badge>
                        )}
                        {aiSuggestions.suggestedLabels?.length > 0 && (
                          <Badge
                            className="cursor-pointer hover:bg-blue-200 transition-colors gap-1 text-xs py-0.5"
                            onClick={() => applySuggestion('labels')}
                            title={aiSuggestions.suggestedLabels.join(', ')}
                          >
                            <Tag size={12} />
                            {aiSuggestions.suggestedLabels.length} labels
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <DialogTitle className="text-2xl leading-tight">{task.content}</DialogTitle>
              )}
            </div>
            
            <div className="flex gap-1 flex-shrink-0">
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
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash size={18} />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Meta badges */}
          <div className="flex gap-2 flex-wrap items-center">
            {dueStr && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <CalendarBlank size={16} />
                {format(parseISO(dueStr), 'dd MMMM yyyy', { locale:  pl })}
              </Badge>
            )}
            
            {task.priority && task.priority < 4 && (
              <Badge variant={task.priority === 1 ? 'destructive' : 'secondary'} className="gap-1.5 px-3 py-1.5">
                <Flag size={16} />
                P{task.priority} - {priorityLabels[task.priority]}
              </Badge>
            )}
            
            {currentProject && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <FolderOpen size={16} />
                {currentProject.name}
              </Badge>
            )}
            
            {task.duration && task.duration > 0 && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <Clock size={16} />
                {task.duration} min
              </Badge>
            )}
          </div>
          
          {!isEditing && <Separator />}
          
          {/* View Mode */}
          {!isEditing && (
            <>
              {/* Description */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">Opis</h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {task.description || 'Brak opisu'}
                </p>
              </div>
              
              {/* Subtasks */}
              {subtasksTotal > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <CheckSquare size={18} />
                    Podzadania ({subtasksCompleted}/{subtasksTotal})
                  </h3>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${subtasksProgress}%` }}
                    />
                  </div>
                  
                  {/* Subtasks list */}
                  <div className="space-y-2">
                    {task.subtasks?.map(subtask => (
                      <div 
                        key={subtask.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <CheckCircle 
                          size={20} 
                          weight={subtask.completed ? 'fill' : 'regular'}
                          className={subtask.completed ? 'text-green-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'}
                        />
                        <span className={subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}>
                          {subtask.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Separator />
              
              {/* AI & Timer Actions */}
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
            </>
          )}
          
          {/* Edit Mode */}
          {isEditing && (
            <>
              <Separator />
              <div className="space-y-5">
                <h3 className="font-semibold text-lg">Edycja zadania</h3>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Opis</label>
                  <Textarea 
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={5}
                    placeholder="Dodaj opis zadania..."
                    disabled={loading}
                    className="resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1.5">
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
                  
                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1.5">
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
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1.5">
                    <Flag size={16} />
                    Priorytet
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditedPriority(p as 1 | 2 | 3 | 4)}
                        className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                          editedPriority === p
                            ? 'border-brand-purple bg-brand-purple/10 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        disabled={loading}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${priorityColors[p as 1 | 2 | 3 | 4]}`} />
                          P{p}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Project */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1.5">
                    <FolderOpen size={16} />
                    Projekt
                  </label>
                  <select
                    value={editedProjectId}
                    onChange={(e) => setEditedProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="">Brak projektu</option>
                    {projects.map(p => (
                      <option key={p.id} value={p. id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
          
          <Separator />
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <Button 
              onClick={handleComplete}
              variant="default"
              className="gap-2 bg-green-600 hover:bg-green-700 order-2 sm:order-1"
              disabled={loading}
            >
              <CheckCircle size={18} weight="bold" />
              Ukończ zadanie
            </Button>
            
            {isEditing &&  (
              <div className="flex gap-2 order-1 sm:order-2">
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
                  className="flex-1"
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={loading || !editedTitle.trim()}
                  className="gap-2 flex-1"
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
            )}
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
