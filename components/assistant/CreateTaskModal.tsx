'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { CalendarBlank, Clock, Tag, FolderOpen, Flag, Sparkle, Brain, PencilSimple, Lightning, CheckCircle } from '@phosphor-icons/react'
import { format, addDays } from 'date-fns'

interface Project {
  id: string
  name: string
  color?:  string
}

interface Label {
  id: string
  name: string
  color?: string
}

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTask: (taskData: any) => Promise<any>
}

export function CreateTaskModal({ open, onOpenChange, onCreateTask }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4)
  const [projectId, setProjectId] = useState<string>('')
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0)
  const [labels, setLabels] = useState<string[]>([])
  const [availableLabels, setAvailableLabels] = useState<Label[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({})
  
  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<{
    understanding?: string
    priority?: number
    estimatedMinutes?: number
    description?: string
    suggestedProject?: string
    suggestedDueDate?: string
    suggestedLabels?: string[]
    actionPlan?: string[]
    cognitiveLoad?: number
  } | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planGenerated, setPlanGenerated] = useState(false)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [aiUnderstanding, setAiUnderstanding] = useState('')
  const [cognitiveLoad, setCognitiveLoad] = useState<1 | 2 | 3 | 4 | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  // Fetch projects and labels on mount
  useEffect(() => {
    if (! open || !token) return
    
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/todoist/projects?token=${token}`)
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || data || [])
        } else {
          console.error('Failed to fetch projects:', res.status, await res.text())
        }
      } catch (err) {
        console.error('Error fetching projects:', err)
      }
    }
    
    const fetchLabels = async () => {
      try {
        const res = await fetch(`/api/todoist/labels?token=${token}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableLabels(data.labels || [])
        } else {
          console.error('Failed to fetch labels:', res.status, await res.text())
        }
      } catch (err) {
        console.error('Error fetching labels:', err)
      }
    }
    
    fetchProjects()
    fetchLabels()
  }, [open, token])
  
  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority(4)
      setProjectId('')
      setEstimatedMinutes(0)
      setLabels([])
      setErrors({})
      setAiSuggestions(null)
      setPlanGenerated(false)
      setGeneratingPlan(false)
      setShowCorrectionModal(false)
      setCorrectionText('')
      setAiUnderstanding('')
      setCognitiveLoad(null)
    }
  }, [open])
  
  // Fetch AI suggestions when title changes (with debounce)
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Reset suggestions if title is too short
    if (title.length < 5) {
      setAiSuggestions(null)
      setLoadingSuggestions(false)
      return
    }
    
    // Set loading state
    setLoadingSuggestions(true)
    
    // Debounce for 1 second
    debounceTimerRef.current = setTimeout(() => {
      // Fetch suggestions in async IIFE to handle errors properly
      (async () => {
        try {
          // Get userId from localStorage (using token as identifier for now)
          const userId = token || 'anonymous'
          
          const response = await fetch('/api/ai/suggest-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              title,
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
  }, [title, projects, token])
  
  const applySuggestion = (field: 'priority' | 'estimatedMinutes' | 'description' | 'project' | 'dueDate' | 'labels') => {
    if (!aiSuggestions) return
    
    switch (field) {
      case 'priority':
        if (aiSuggestions.priority) {
          setPriority(aiSuggestions.priority as 1 | 2 | 3 | 4)
        }
        break
      case 'estimatedMinutes':
        if (aiSuggestions.estimatedMinutes) {
          setEstimatedMinutes(aiSuggestions.estimatedMinutes)
        }
        break
      case 'description':
        if (aiSuggestions.description) {
          setDescription(aiSuggestions.description)
        }
        break
      case 'project':
        if (aiSuggestions.suggestedProject) {
          // Find project by name (case-insensitive and flexible matching)
          const suggestedName = aiSuggestions.suggestedProject.toLowerCase().trim()
          const project = projects.find(p => 
            p.name.toLowerCase().trim() === suggestedName ||
            p.name.toLowerCase().includes(suggestedName) ||
            suggestedName.includes(p.name.toLowerCase())
          )
          if (project) {
            setProjectId(project.id)
          }
        }
        break
      case 'dueDate':
        if (aiSuggestions.suggestedDueDate) {
          setDueDate(aiSuggestions.suggestedDueDate)
        }
        break
      case 'labels':
        if (aiSuggestions.suggestedLabels && aiSuggestions.suggestedLabels.length > 0) {
          setLabels(aiSuggestions.suggestedLabels)
        }
        break
    }
  }
  
  const handleApplyParameters = () => {
    if (!aiSuggestions) return
    
    // Apply all suggestions without generating plan
    if (aiSuggestions.priority) {
      setPriority(aiSuggestions.priority as 1 | 2 | 3 | 4)
    }
    if (aiSuggestions.cognitiveLoad) {
      setCognitiveLoad(aiSuggestions.cognitiveLoad as 1 | 2 | 3 | 4)
    }
    if (aiSuggestions.estimatedMinutes) {
      setEstimatedMinutes(aiSuggestions.estimatedMinutes)
    }
    if (aiSuggestions.suggestedDueDate) {
      setDueDate(aiSuggestions.suggestedDueDate)
    }
    if (aiSuggestions.suggestedProject) {
      const suggestedName = aiSuggestions.suggestedProject.toLowerCase().trim()
      const project = projects.find(p => 
        p.name.toLowerCase().trim() === suggestedName ||
        p.name.toLowerCase().includes(suggestedName) ||
        suggestedName.includes(p.name.toLowerCase())
      )
      if (project) {
        setProjectId(project.id)
      }
    }
    if (aiSuggestions.suggestedLabels && aiSuggestions.suggestedLabels.length > 0) {
      setLabels(aiSuggestions.suggestedLabels)
    }
    if (aiSuggestions.description && !description.trim()) {
      setDescription(aiSuggestions.description)
    }
    
    // Hide AI suggestions after applying
    setPlanGenerated(false)
  }
  
  const handleGeneratePlan = async () => {
    if (!title.trim()) return
    
    setGeneratingPlan(true)
    
    try {
      const userId = token || 'anonymous'
      
      const response = await fetch('/api/ai/generate-action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title,
          description,
          understanding: aiUnderstanding || title,
          userId,
          userContext: {
            projects: projects.map(p => ({ id: p.id, name: p.name }))
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Update aiSuggestions with the action plan
        setAiSuggestions(data)
        
        // Auto-apply all suggestions
        if (data.priority) {
          setPriority(data.priority as 1 | 2 | 3 | 4)
        }
        if (data.cognitiveLoad) {
          setCognitiveLoad(data.cognitiveLoad as 1 | 2 | 3 | 4)
        }
        if (data.estimatedMinutes) {
          setEstimatedMinutes(data.estimatedMinutes)
        }
        if (data.suggestedDueDate) {
          setDueDate(data.suggestedDueDate)
        }
        if (data.suggestedProject) {
          const suggestedName = data.suggestedProject.toLowerCase().trim()
          const project = projects.find(p => 
            p.name.toLowerCase().trim() === suggestedName ||
            p.name.toLowerCase().includes(suggestedName) ||
            suggestedName.includes(p.name.toLowerCase())
          )
          if (project) {
            setProjectId(project.id)
          }
        }
        if (data.suggestedLabels && data.suggestedLabels.length > 0) {
          setLabels(data.suggestedLabels)
        }
        if (data.description && !description.trim()) {
          setDescription(data.description)
        }
        
        setPlanGenerated(true)
      }
    } catch (err) {
      console.error('Error generating plan:', err)
      alert('Nie udało się wygenerować planu')
    } finally {
      setGeneratingPlan(false)
    }
  }
  
  const handleCorrection = () => {
    setShowCorrectionModal(true)
  }
  
  const handleCorrectionSubmit = async () => {
    if (!correctionText.trim()) return
    
    setShowCorrectionModal(false)
    setAiUnderstanding(correctionText)
    setPlanGenerated(false) // Reset plan when correcting
    
    // Regenerate suggestions with correction
    setLoadingSuggestions(true)
    
    try {
      const userId = token || 'anonymous'
      
      const response = await fetch('/api/ai/suggest-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title,
          description: correctionText,
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
      setCorrectionText('')
    }
  }
  
  const validate = () => {
    const newErrors:  { title?: string; dueDate?: string } = {}
    
    if (!title.trim()) {
      newErrors.title = 'Tytuł jest wymagany'
    }
    
    if (dueDate) {
      const date = new Date(dueDate)
      if (isNaN(date.getTime())) {
        newErrors.dueDate = 'Nieprawidłowa data'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setLoading(true)
    
    try {
      const taskData:  any = {
        content: title. trim(),
        token
      }
      
      // Add description WITHOUT action plan
      if (description.trim()) {
        taskData.description = description.trim()
      }
      
      if (dueDate) {
        taskData.due = dueDate
      }
      
      if (priority < 4) {
        taskData.priority = priority
      }
      
      if (projectId) {
        taskData.project_id = projectId
      }
      
      // Add cognitive load label if selected
      const allLabels = [...labels]
      if (cognitiveLoad) {
        allLabels.push(`cognitive-${cognitiveLoad}`)
      }
      
      if (allLabels.length > 0) {
        taskData. labels = allLabels
      }
      
      // Custom metadata (może być używane lokalnie)
      if (estimatedMinutes > 0) {
        taskData.duration = estimatedMinutes
      }
      
      const result = await onCreateTask(taskData)
      
      // Add action plan as comment if exists
      if (aiSuggestions?.actionPlan && aiSuggestions.actionPlan.length > 0) {
        try {
          // Extract task ID from result - it might be in different places depending on the API
          const createdTaskId = result?.id || result?.task?.id
          
          if (createdTaskId) {
            const planText = '📋 Plan działania:\n' + 
              aiSuggestions.actionPlan.map((step, i) => `${i + 1}. ${step}`).join('\n')
            
            await fetch('/api/todoist/comments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token,
                task_id: createdTaskId,
                content: planText
              })
            })
          }
        } catch (commentErr) {
          console.error('⚠️ Failed to add action plan as comment:', commentErr)
          // Don't fail the whole operation if comment fails
        }
      }
      
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Nie udało się utworzyć zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const priorityOptions = [
    { value: 1, label: 'P1 - Pilne', color: 'bg-red-500' },
    { value:  2, label: 'P2 - Wysokie', color: 'bg-orange-500' },
    { value: 3, label: 'P3 - Normalne', color: 'bg-blue-500' },
    { value: 4, label: 'P4 - Niskie', color: 'bg-gray-400' }
  ]
  
  const quickDates = [
    { label: 'Dziś', value: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Jutro', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'Za 3 dni', value: format(addDays(new Date(), 3), 'yyyy-MM-dd') },
    { label: 'Za tydzień', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') }
  ]
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Correction Overlay */}
        {showCorrectionModal && (
          <div className="absolute inset-0 bg-white z-50 rounded-2xl p-6 flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-700">
                <PencilSimple size={24} weight="bold" />
                Doprecyzuj zrozumienie
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 space-y-4 py-4 overflow-y-auto">
              {/* AI Understanding */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-800 mb-1">🤖 AI rozumie to tak:</p>
                <p className="text-sm text-gray-700">{title}</p>
              </div>
              
              {/* Correction Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  ✍️ Co AI powinno zrozumieć inaczej?
                </label>
                <Textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder="Np. To zadanie dotyczy szkolenia online, nie stacjonarnego. Będzie potrzebna prezentacja i nagranie wideo."
                  rows={6}
                  className="resize-none"
                  autoFocus
                />
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowCorrectionModal(false)
                  setCorrectionText('')
                }}
              >
                Anuluj
              </Button>
              <Button 
                onClick={handleCorrectionSubmit}
                disabled={!correctionText.trim()}
                className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Lightning size={16} weight="fill" />
                Popraw i wygeneruj ponownie
              </Button>
            </DialogFooter>
          </div>
        )}
        
        <DialogHeader>
          <DialogTitle className="text-2xl">Nowe Zadanie</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tytuł zadania <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co trzeba zrobić?"
              className={errors.title ? 'border-red-500' : ''}
              disabled={loading}
              autoFocus
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
            
            {/* AI Suggestions */}
            {loadingSuggestions && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <div className="w-3 h-3 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                <span>Generuję sugestie...</span>
              </div>
            )}
            
            {aiSuggestions && !loadingSuggestions && !planGenerated && (
              <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <Sparkle size={18} weight="fill" className="text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 font-medium mb-1">🤖 AI rozumie to jako:</p>
                    <p className="text-sm text-gray-700">{aiSuggestions.understanding || title}</p>
                  </div>
                </div>
                
                {/* Three main buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    onClick={handleApplyParameters}
                    disabled={loading}
                    className="flex-1 gap-2 border border-blue-300 hover:bg-blue-50"
                    variant="ghost"
                  >
                    <CheckCircle size={16} />
                    Uzupełnij parametry
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCorrection}
                    disabled={loading || generatingPlan}
                    className="flex-1 gap-2 border border-purple-300 hover:bg-purple-50"
                  >
                    <PencilSimple size={16} weight="bold" />
                    Doprecyzuj
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGeneratePlan}
                    disabled={loading || generatingPlan}
                    className="flex-1 gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {generatingPlan ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generuję...
                      </>
                    ) : (
                      <>
                        <Lightning size={16} weight="fill" />
                        ⚡ Wygeneruj plan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Action Plan Display */}
            {planGenerated && aiSuggestions?.actionPlan && (
              <div className="mt-3 space-y-3">
                {/* Applied Parameters Badge */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">💡 Parametry zostały automatycznie ustawione (możesz je zmienić)</p>
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestions.priority && (
                      <Badge className="bg-gray-200 text-gray-700">
                        P{aiSuggestions.priority}
                      </Badge>
                    )}
                    {aiSuggestions.cognitiveLoad && (
                      <Badge className="bg-gray-200 text-gray-700">
                        C{aiSuggestions.cognitiveLoad}
                      </Badge>
                    )}
                    {aiSuggestions.estimatedMinutes && (
                      <Badge className="bg-gray-200 text-gray-700">
                        {aiSuggestions.estimatedMinutes} min
                      </Badge>
                    )}
                    {aiSuggestions.suggestedDueDate && (
                      <Badge className="bg-gray-200 text-gray-700">
                        📅 {aiSuggestions.suggestedDueDate}
                      </Badge>
                    )}
                    {aiSuggestions.suggestedProject && (
                      <Badge className="bg-gray-200 text-gray-700">
                        📁 {aiSuggestions.suggestedProject}
                      </Badge>
                    )}
                    {aiSuggestions.suggestedLabels && aiSuggestions.suggestedLabels.length > 0 && (
                      <Badge className="bg-gray-200 text-gray-700">
                        🏷️ {aiSuggestions.suggestedLabels.length} etykiet
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Action Plan Box */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📋</span>
                    <h3 className="font-semibold text-green-800">Twój plan działania</h3>
                  </div>
                  <ul className="space-y-2">
                    {aiSuggestions.actionPlan.map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-green-700">
                      💡 Ten plan zostanie automatycznie dodany jako komentarz do zadania
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Opis
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowe szczegóły..."
              rows={4}
              disabled={loading}
            />
          </div>
          
          {/* Grid Layout for 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <CalendarBlank size={18} />
                Data wykonania
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target. value)}
                className={errors. dueDate ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.dueDate && (
                <p className="text-red-500 text-sm mt-1">{errors. dueDate}</p>
              )}
              
              {/* Quick date buttons */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {quickDates.map(qd => (
                  <button
                    key={qd. label}
                    type="button"
                    onClick={() => setDueDate(qd.value)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
                    disabled={loading}
                  >
                    {qd.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Flag size={18} />
                Priorytet
              </label>
              <div className="grid grid-cols-2 gap-2">
                {priorityOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value as 1 | 2 | 3 | 4)}
                    className={`px-3 py-2 rounded-lg border-2 transition text-sm font-medium ${
                      priority === opt.value
                        ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                      {opt.label. split(' - ')[0]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Cognitive Load */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Brain size={18} />
                Obciążenie kognitywne
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setCognitiveLoad(1)}
                  className={`px-3 py-3 rounded-lg border-2 transition text-sm ${
                    cognitiveLoad === 1
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="font-semibold mb-1">C1</div>
                  <div className="text-xs">Proste</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCognitiveLoad(2)}
                  className={`px-3 py-3 rounded-lg border-2 transition text-sm ${
                    cognitiveLoad === 2
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="font-semibold mb-1">C2</div>
                  <div className="text-xs">Umiarkowane</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCognitiveLoad(3)}
                  className={`px-3 py-3 rounded-lg border-2 transition text-sm ${
                    cognitiveLoad === 3
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="font-semibold mb-1">C3</div>
                  <div className="text-xs">Złożone</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCognitiveLoad(4)}
                  className={`px-3 py-3 rounded-lg border-2 transition text-sm ${
                    cognitiveLoad === 4
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="font-semibold mb-1">C4</div>
                  <div className="text-xs">Bardzo złożone</div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Second grid for Project and Estimated Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <FolderOpen size={18} />
                Projekt
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus: ring-2 focus:ring-brand-purple"
                disabled={loading}
              >
                <option value="">Brak projektu</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            {/* Estimated Time */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock size={18} />
                Estymacja (minuty)
              </label>
              <Input
                type="number"
                value={estimatedMinutes || ''}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="5"
                disabled={loading}
              />
            </div>
          </div>
          
          {/* Labels */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Tag size={18} />
              Etykiety
            </label>
            
            {/* Selected Labels */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {labels.map((label, idx) => (
                  <Badge 
                    key={idx} 
                    className="bg-blue-100 text-blue-700 cursor-pointer hover:bg-red-100 hover:text-red-700"
                    onClick={() => setLabels(labels.filter((_, i) => i !== idx))}
                  >
                    {label} ×
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Available Labels */}
            {availableLabels.length > 0 ? (
              <div className="space-y-2">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                  value=""
                  onChange={(e) => {
                    const selectedLabel = e.target.value
                    if (selectedLabel && !labels.includes(selectedLabel)) {
                      setLabels([...labels, selectedLabel])
                    }
                  }}
                  disabled={loading}
                >
                  <option value="">Wybierz etykietę z Todoist...</option>
                  {availableLabels
                    .filter(label => !labels.includes(label.name))
                    .map(label => (
                      <option key={label.id} value={label.name}>
                        {label.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500">
                  Kliknij na wybraną etykietę aby ją usunąć
                </p>
              </div>
            ) : (
              <Input
                value={labels.join(', ')}
                onChange={(e) => setLabels(e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
                placeholder="Wpisz etykiety oddzielone przecinkami"
                disabled={loading}
              />
            )}
          </div>
        </form>
        
        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Anuluj
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Tworzenie...
              </>
            ) : (
              'Utwórz zadanie'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
